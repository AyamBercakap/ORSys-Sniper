
browser.runtime.onInstalled.addListener(() => {
  setInitialTheme();
});

// Set initial theme from storage or default
async function setInitialTheme() {
  try {
    const result = await browser.storage.local.get(['theme']);
    const theme = result.theme || 'light'; // Default to light theme
    setAllIcons(theme);
  } catch (error) {
    console.error('Error loading theme:', error);
    setAllIcons('light'); // Fallback to light theme
  }
}

browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'THEME_CHANGED') {
    setAllIcons(request.theme);
  }
});

// Function to set all icons based on theme
function setAllIcons(theme) {
  const iconPath = theme === 'dark' ? 'icons/dark' : 'icons/light';
  const iconPaths = {
    "16": `${iconPath}/icon16.png`,
    "32": `${iconPath}/icon32.png`,
    "48": `${iconPath}/icon48.png`,
    "128": `${iconPath}/icon128.png`
  };

  browser.sidebarAction.setIcon({ path: iconPaths }).catch(error => {
    console.error('Error setting sidebar icon:', error);
  });

  browser.browserAction.setIcon({
    path: {
      "16": iconPaths["16"],
      "32": iconPaths["32"],
      "48": iconPaths["48"],
      "128": iconPaths["128"]
    }
  }).catch(error => {
    console.error('Error setting browser action icon:', error);
  });
}

browser.browserAction.onClicked.addListener(() => {
  browser.sidebarAction.open().catch(error => {
    console.error('Error opening sidebar:', error);
  });
});