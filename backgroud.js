// Background service worker for the extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('AI Note Taker extension installed');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.action.openPopup();
});