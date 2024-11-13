// background.js

const apiKey = 'txatxA2dfoB9EOCCqkhpBYF2FhDBf08vkEbsSS6u5OWCVwnLDHjQS8oj'; // Replace with your actual API key

// Create context menu items
function createContextMenus() {
  chrome.contextMenus.removeAll(() => {
    // Parent menu
    chrome.contextMenus.create({
      id: 'propeller',
      title: 'Propeller',
      contexts: ['all']
    });

    // Child menus under Propeller
    chrome.contextMenus.create({
      id: 'solve-mcq',
      parentId: 'propeller',
      title: 'Solve MCQ',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'search-code',
      parentId: 'propeller',
      title: 'Search Code',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'search-normal',
      parentId: 'propeller',
      title: 'Search Normal',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'copy-selected-text',
      parentId: 'propeller',
      title: 'Copy',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'paste-menu',
      parentId: 'propeller',
      title: 'Paste',
      contexts: ['all']
    });

    // Submenu under Paste
    chrome.contextMenus.create({
      id: 'paste-typing',
      parentId: 'paste-menu',
      title: 'Paste by typing',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'paste-swapping',
      parentId: 'paste-menu',
      title: 'Paste by swapping',
      contexts: ['all']
    });

    chrome.contextMenus.create({
      id: 'image-snip',
      parentId: 'propeller',
      title: 'Image Snip',
      contexts: ['all']
    });
  });
}

// Create context menus when the extension is installed or updated
chrome.runtime.onInstalled.addListener(() => {
  createContextMenus();
});

// Also create context menus when the background script starts
chrome.runtime.onStartup.addListener(() => {
  createContextMenus();
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'solve-mcq') {
    chrome.tabs.sendMessage(tab.id, { type: 'search-mcq' });
  } else if (info.menuItemId === 'search-code') {
    chrome.tabs.sendMessage(tab.id, { type: 'generate-code' });
  } else if (info.menuItemId === 'search-normal') {
    chrome.tabs.sendMessage(tab.id, { type: 'search-normal' });
  } else if (info.menuItemId === 'copy-selected-text') {
    chrome.tabs.sendMessage(tab.id, { type: 'copy-selected-text' });
  } else if (info.menuItemId === 'paste-typing') {
    chrome.tabs.sendMessage(tab.id, { type: 'simulate-paste' });
  } else if (info.menuItemId === 'paste-swapping') {
    chrome.tabs.sendMessage(tab.id, { type: 'paste-swapping' });
  } else if (info.menuItemId === 'image-snip') {
    chrome.tabs.sendMessage(tab.id, { type: 'start-snip' });
  }
});

// Handle keyboard commands
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];

    if (command === "search-mcq") {
      chrome.tabs.sendMessage(tab.id, { type: 'search-mcq' });
    } else if (command === "search-normal") {
      chrome.tabs.sendMessage(tab.id, { type: 'search-normal' });
    } else if (command === "generate-code") {
      chrome.tabs.sendMessage(tab.id, { type: 'generate-code' });
    } else if (command === "copy-selected-text") {
      chrome.tabs.sendMessage(tab.id, { type: 'copy-selected-text' });
    } else if (command === "simulate-paste") {
      chrome.tabs.sendMessage(tab.id, { type: 'simulate-paste' });
    } else if (command === "image-snip") {
      chrome.tabs.sendMessage(tab.id, { type: 'start-snip' });
    } else if (command === "paste-swapping") {
      chrome.tabs.sendMessage(tab.id, { type: 'paste-swapping' });
    }
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'selection') {
    const rect = message.rect;

    chrome.tabs.captureVisibleTab(sender.tab.windowId, { format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        console.error('captureVisibleTab failed: ', chrome.runtime.lastError.message);
        return;
      }
      // Send the dataUrl and rect back to the content script
      chrome.tabs.sendMessage(sender.tab.id, { type: 'screenshot', dataUrl: dataUrl, rect: rect });
    });
  } else if (message.type === 'send-text-to-server') {
    const text = message.text;
    const serverUrl = message.serverUrl;

    fetch(serverUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ text: text })
    })
      .then(response => response.json())
      .then(data => {
        // Send the response back to the content script
        chrome.tabs.sendMessage(sender.tab.id, { type: 'server-response', answer: data.answer });
      })
      .catch(error => {
        console.error('Error:', error);
        chrome.tabs.sendMessage(sender.tab.id, { type: 'server-response', error: error.message });
      });
  } else if (message.type === 'transcribe-image') {
    const imageData = message.imageData;

    fetch('https://propel.ziqfm.com/transcribe_image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({ image_data: imageData })
    })
      .then(response => response.json())
      .then(data => {
        // Send the transcription back to the content script
        chrome.tabs.sendMessage(sender.tab.id, { type: 'image-transcription', transcription: data.transcription });
      })
      .catch(error => {
        console.error('Error:', error);
        chrome.tabs.sendMessage(sender.tab.id, { type: 'image-transcription', error: error.message });
      });
  }
});
