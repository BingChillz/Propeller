chrome.commands.onCommand.addListener((command) => {
    if (command === "copy-text") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: sendClipboardDataToServer,
                args: ['https://propel.ziqfm.com/chat']
            });
        });
    } else if (command === "copy-mcq") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: sendClipboardDataToServer,
                args: ['https://propel.ziqfm.com/mcq']
            });
        });
    } else if (command === "image") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                function: sendClipboardImageToServer,
                args: ['https://propel.ziqfm.com/image']
            });
        });
    } 
});

function sendClipboardDataToServer(url) {
    document.body.style.cursor = 'wait';
    const AUTH_TOKEN = "rFMRDUF1erkUTT";
    navigator.clipboard.readText().then((text) => {
        const requestData = {
            content: text
        };

        fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_TOKEN}`
            },
            body: JSON.stringify(requestData)
        })
        .then(response => response.json())
        .then(data => {
            const responseString = data.response;

            navigator.clipboard.writeText(responseString).then(() => {
                console.log("Updated clipboard content: ", responseString);
                document.body.style.cursor = 'default';
            }).catch(err => {
                console.error('Failed to write to clipboard: ', err);
                document.body.style.cursor = 'default';
            });
        })
        .catch(err => {
            console.error('Error during fetch: ', err);
            document.body.style.cursor = 'default';
        });
    }).catch(err => {
        console.error('Failed to read clipboard: ', err);
        document.body.style.cursor = 'default';
    });
}

function sendClipboardImageToServer() {
    document.body.style.cursor = 'wait';
    const AUTH_TOKEN = "rFMRDUF1erkUTT";
    navigator.clipboard.read().then((items) => {
        console.log('Clipboard Items:', items);

        for (const item of items) {
            console.log('Clipboard Item Types:', item.types);

            if (item.types.includes('image/png')) {
                item.getType('image/png').then((blob) => {
                    console.log('Clipboard Image Blob:', blob);

                    const formData = new FormData();
                    formData.append('file', blob, 'clipboard-image.png');

                    fetch('https://propel.ziqfm.com/image', {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${AUTH_TOKEN}`
                        },
                        body: formData
                    })
                    .then(response => response.json())
                    .then(data => {
                        console.log("Image uploaded successfully: ", data);

                        if (data.response) {
                            const textBlob = new Blob([data.response], { type: 'text/plain' });
                            navigator.clipboard.write([new ClipboardItem({ "text/plain": textBlob })])
                            .then(() => {
                                console.log("Clipboard updated with server response.");
                            })
                            .catch(err => {
                                console.error("Failed to write to clipboard: ", err);
                            });
                        }

                        document.body.style.cursor = 'default';
                    })
                    .catch(err => {
                        console.error('Error during image upload: ', err);
                        document.body.style.cursor = 'default';
                    });
                }).catch(err => {
                    console.error('Failed to get image from clipboard:', err);
                    document.body.style.cursor = 'default';
                });
            } else {
                console.log('No image found in the clipboard.');
                document.body.style.cursor = 'default';
            }
        }
    }).catch(err => {
        console.error('Failed to read clipboard:', err);
        document.body.style.cursor = 'default';
    });
}
