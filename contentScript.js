// contentScript.js

(function () {
  let lastRequestType = ''; // Tracks the type of the last request
  let isSimulatingTyping = false;

  // Function to start MCQ solving
  function solveMCQ() {
    let selectedText = window.getSelection().toString();

    if (selectedText && selectedText.trim().length > 0) {
      sendTextToServer(selectedText, 'mcq');
    } else {
      navigator.clipboard.readText().then(clipboardText => {
        if (clipboardText && clipboardText.trim().length > 0) {
          sendTextToServer(clipboardText, 'mcq');
        }
      }).catch(err => {
        console.error('Failed to read clipboard contents: ', err);
      });
    }
  }

  // Function to perform normal search
  function searchNormal() {
    navigator.clipboard.readText().then(clipboardText => {
      if (clipboardText && clipboardText.trim().length > 0) {
        sendTextToServer(clipboardText, 'normal-search');
      }
    }).catch(err => {
      console.error('Failed to read clipboard contents: ', err);
    });
  }

  function generateCode() {
    let selectedText = window.getSelection().toString();

    if (selectedText && selectedText.trim().length > 0) {
      sendTextToServer(selectedText, 'code-generation');
    } else {
      navigator.clipboard.readText().then(clipboardText => {
        if (clipboardText && clipboardText.trim().length > 0) {
          sendTextToServer(clipboardText, 'code-generation');
        }
      }).catch(err => {
        console.error('Failed to read clipboard contents: ', err);
      });
    }
  }

  // Function to copy selected text
  function copySelectedText() {
    let selectedText = window.getSelection().toString();

    if (selectedText && selectedText.trim().length > 0) {
      copyToClipboard(selectedText);
    }
  }

  // Function to simulate paste by typing
  function simulatePaste() {
    if (isSimulatingTyping) {
      return;
    }

    navigator.clipboard.readText().then(clipboardText => {
      if (clipboardText && clipboardText.trim().length > 0) {
        isSimulatingTyping = true;
        simulateTyping(clipboardText);
      }
    }).catch(err => {
      console.error('Failed to read clipboard contents: ', err);
    });
  }

  // Updated simulateTyping function
  function simulateTyping(text) {
    const activeElement = document.activeElement;

    if (activeElement && (activeElement.isContentEditable || activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
      let index = 0;

      // Normalize newlines to '\n'
      text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

      function preventKeystrokes(e) {
        e.stopPropagation();
        e.preventDefault();
      }

      window.addEventListener('keydown', preventKeystrokes, true);
      window.addEventListener('keypress', preventKeystrokes, true);
      window.addEventListener('keyup', preventKeystrokes, true);

      function typeCharacter() {
        if (index < text.length) {
          const char = text.charAt(index);

          if (activeElement.isContentEditable) {
            if (char === '\n') {
              // Insert a line break
              document.execCommand('insertHTML', false, '<br>');
            } else {
              document.execCommand('insertText', false, char);
            }
          } else {
            const start = activeElement.selectionStart;
            const end = activeElement.selectionEnd;
            const value = activeElement.value;
            activeElement.value = value.slice(0, start) + char + value.slice(end);
            activeElement.selectionStart = activeElement.selectionEnd = start + 1;
          }

          index++;
          setTimeout(typeCharacter, 0); // Fast typing
        } else {
          isSimulatingTyping = false;
          window.removeEventListener('keydown', preventKeystrokes, true);
          window.removeEventListener('keypress', preventKeystrokes, true);
          window.removeEventListener('keyup', preventKeystrokes, true);
        }
      }

      typeCharacter();
    } else {
      isSimulatingTyping = false;
    }
  }

  // Function to paste by swapping content
  function pasteSwapping() {
    navigator.clipboard.readText().then(clipboardText => {
      if (clipboardText !== undefined && clipboardText !== null) {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.isContentEditable || activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          if (activeElement.isContentEditable) {
            activeElement.innerText = clipboardText;
          } else {
            activeElement.value = clipboardText;
          }
        }
      }
    }).catch(err => {
      console.error('Failed to read clipboard contents: ', err);
    });
  }

  function sendTextToServer(text, requestType) {
    lastRequestType = requestType;

    document.documentElement.style.cursor = 'wait';

    let serverUrl;
    if (requestType === 'code-generation') {
      serverUrl = 'https://propel.ziqfm.com/generate_code';
    } else if (requestType === 'mcq') {
      serverUrl = 'https://propel.ziqfm.com/solve_mcq';
    } else if (requestType === 'normal-search') {
      serverUrl = 'https://propel.ziqfm.com/search_normal';
    }

    chrome.runtime.sendMessage({ type: 'send-text-to-server', text: text, serverUrl: serverUrl });
  }

  // Listen for messages from the background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'start-snip') {
      startSnip();
    } else if (message.type === 'screenshot') {
      handleScreenshot(message);
    } else if (message.type === 'search-mcq') {
      solveMCQ();
    } else if (message.type === 'search-normal') {
      searchNormal();
    } else if (message.type === 'generate-code') {
      generateCode();
    } else if (message.type === 'copy-selected-text') {
      copySelectedText();
    } else if (message.type === 'simulate-paste') {
      simulatePaste();
    } else if (message.type === 'paste-swapping') {
      pasteSwapping();
    } else if (message.type === 'server-response') {
      handleServerResponse(message);
    } else if (message.type === 'image-transcription') {
      handleImageTranscriptionResponse(message);
    }
  });

  // Function to handle server response
  function handleServerResponse(message) {
    document.documentElement.style.cursor = 'default';

    if (message.answer) {
      if (lastRequestType === 'mcq') {
        showToast(message.answer);
      } else {
        copyToClipboard(message.answer);
      }
    } else if (message.error) {
      console.error('Error: ' + message.error);
    }
  }

  // Function to handle image transcription response
  function handleImageTranscriptionResponse(message) {
    document.documentElement.style.cursor = 'default';

    if (message.transcription) {
      copyToClipboard(message.transcription);
    } else if (message.error) {
      console.error('Error: ' + message.error);
    }
  }

  // Function to handle screenshot (Image Snip)
  function handleScreenshot(message) {
    const img = new Image();
    img.onload = function () {
      const canvas = document.createElement("canvas");
      canvas.width = message.rect.width / window.devicePixelRatio;
      canvas.height = message.rect.height / window.devicePixelRatio;
      const ctx = canvas.getContext("2d");

      ctx.drawImage(
        img,
        message.rect.left,
        message.rect.top,
        message.rect.width,
        message.rect.height,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // Get base64 image data
      const imageData = canvas.toDataURL('image/png');

      // Send image data to background script for transcription
      document.documentElement.style.cursor = 'wait';
      chrome.runtime.sendMessage({ type: 'transcribe-image', imageData: imageData });
    };
    img.src = message.dataUrl;
  }

  function showToast(message) {
    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.position = 'fixed';
    toast.style.bottom = '20px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.backgroundColor = '#333';
    toast.style.color = '#fff';
    toast.style.padding = '10px 20px';
    toast.style.borderRadius = '5px';
    toast.style.zIndex = '9999999999999';
    toast.style.fontSize = '16px';

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.remove();
    }, 1000);
  }

  function copyToClipboard(text) {
    navigator.clipboard.writeText(text).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  }

  // Function to start the snip
  function startSnip() {
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0px';
    overlay.style.left = '0px';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    //overlay.style.cursor = 'crosshair';
    overlay.style.zIndex = '9999999999999';
    overlay.style.background = 'rgba(0,0,0,0)';
    document.body.appendChild(overlay);

    let startX, startY, endX, endY;
    let selectionDiv = null;

    function onMouseDown(e) {
      e.preventDefault();
      startX = e.clientX;
      startY = e.clientY;

      selectionDiv = document.createElement('div');
      selectionDiv.style.position = 'fixed';
      //selectionDiv.style.border = '2px dashed #000';
      selectionDiv.style.background = 'rgba(0, 0, 0, 0)';
      selectionDiv.style.left = startX + 'px';
      selectionDiv.style.top = startY + 'px';
      selectionDiv.style.zIndex = '9999999999999';
      overlay.appendChild(selectionDiv);

      overlay.addEventListener('mousemove', onMouseMove);
      overlay.addEventListener('mouseup', onMouseUp);
    }

    function onMouseMove(e) {
      e.preventDefault();
      endX = e.clientX;
      endY = e.clientY;

      const rect = {
        left: Math.min(startX, endX),
        top: Math.min(startY, endY),
        width: Math.abs(startX - endX),
        height: Math.abs(startY - endY)
      };

      selectionDiv.style.left = rect.left + 'px';
      selectionDiv.style.top = rect.top + 'px';
      selectionDiv.style.width = rect.width + 'px';
      selectionDiv.style.height = rect.height + 'px';
    }

    function onMouseUp(e) {
      e.preventDefault();
      overlay.removeEventListener('mousemove', onMouseMove);
      overlay.removeEventListener('mouseup', onMouseUp);
      overlay.parentNode.removeChild(overlay);

      const scale = window.devicePixelRatio;

      // Coordinates in CSS pixels relative to the viewport
      const x1 = startX;
      const y1 = startY;
      const x2 = endX;
      const y2 = endY;

      // Convert coordinates to device pixels
      const rect = {
        left: Math.min(x1, x2) * scale,
        top: Math.min(y1, y2) * scale,
        width: Math.abs(x1 - x2) * scale,
        height: Math.abs(y1 - y2) * scale
      };

      // Send coordinates to background script
      chrome.runtime.sendMessage({ type: 'selection', rect: rect });
    }

    overlay.addEventListener('mousedown', onMouseDown);
  }

  // Always listen for 'screenshot' messages
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'screenshot') {
      handleScreenshot(message);
    }
  });

})();
