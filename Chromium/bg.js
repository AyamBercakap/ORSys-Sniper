
chrome.runtime.onInstalled.addListener(() => {
  setInitialTheme();
});

async function setInitialTheme() {
  try {
    const result = await chrome.storage.local.get(['theme']);
    const theme = result.theme || 'light';
    setThemeIcon(theme);
  } catch (error) {
    console.error('Error loading theme:', error);
    setThemeIcon('light');
  }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'THEME_CHANGED') {
    setThemeIcon(request.theme);
  }
});

function setThemeIcon(theme) {
  const iconPath = theme === 'dark' ? 'icons/dark' : 'icons/light';
  
  chrome.action.setIcon({
    path: {
      "16": `${iconPath}/icon16.png`,
      "32": `${iconPath}/icon32.png`,
      "48": `${iconPath}/icon48.png`,
      "128": `${iconPath}/icon128.png`
    }
  }).catch(error => {
    console.error('Error setting icon:', error);
  });
}