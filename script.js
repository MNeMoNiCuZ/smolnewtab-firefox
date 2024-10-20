// script.js

document.addEventListener('DOMContentLoaded', init);

let defaultSettings = {};
let defaultTabs = [];
let userSettings = {};
let userTabs = [];
let settings = {};
let tabs = [];
let activeTabId = null;

function init() {
  loadDefaults().then(() => {
    loadUserData().then(() => {
      mergeData();
      initializeTabs();
      renderTabs();
      renderSections();

      // Event listeners for buttons
      document.getElementById('options-tab').addEventListener('click', openOptionsModal);
      document.getElementById('add-tab-button').addEventListener('click', () => {
        openTabModal();
      });

      // Modal Save Buttons
      document.getElementById('section-modal-save-button').addEventListener('click', saveSectionModal);
      document.getElementById('page-modal-save-button').addEventListener('click', savePageModal);
      document.getElementById('options-modal-save-button').addEventListener('click', saveOptionsModal);
      document.getElementById('tab-modal-save-button').addEventListener('click', saveTabModal);
      document.getElementById('add-multiple-pages-save-button').addEventListener('click', saveAddMultiplePagesModal);

      // Modal Cancel Buttons
      document.getElementById('section-modal-cancel-button').addEventListener('click', closeModals);
      document.getElementById('page-modal-cancel-button').addEventListener('click', closeModals);
      document.getElementById('options-modal-cancel-button').addEventListener('click', closeModals);
      document.getElementById('tab-modal-cancel-button').addEventListener('click', closeModals);
      document.getElementById('add-multiple-pages-cancel-button').addEventListener('click', closeModals);

      // Event Listeners for Export/Import Modals
      document.getElementById('export-button').addEventListener('click', openExportModal);
      document.getElementById('import-button').addEventListener('click', openImportModal);
      document.getElementById('export-import-save-button').addEventListener('click', saveImportData);
      document.getElementById('export-import-cancel-button').addEventListener('click', closeModals);

      // Hide context menus on click outside
      document.addEventListener('click', removeContextMenus);

      // Keyboard shortcuts in modals
      document.addEventListener('keydown', function (e) {
        if (!document.querySelector('.modal.hidden')) {
          // A modal is open
          const activeModal = document.querySelector('.modal:not(.hidden)');
          if (e.key === 'Enter') {
            e.preventDefault();
            if (activeModal.id === 'section-modal') {
              saveSectionModal();
            } else if (activeModal.id === 'page-modal') {
              savePageModal();
            } else if (activeModal.id === 'options-modal') {
              saveOptionsModal();
            } else if (activeModal.id === 'tab-modal') {
              saveTabModal();
            } else if (activeModal.id === 'add-multiple-pages-modal') {
              saveAddMultiplePagesModal();
            } else if (activeModal.id === 'export-import-modal' && document.getElementById('export-import-save-button').style.display !== 'none') {
              saveImportData();
            }
          } else if (e.key === 'Escape') {
            e.preventDefault();
            closeModals();
          }
        }
      });
    });
  });
}

// Load default settings and tabs
function loadDefaults() {
  return Promise.all([
    fetch('data/defaultSettings.json')
      .then(response => response.json())
      .then(data => {
        defaultSettings = data;
      }),
    fetch('data/defaultTabs.json')
      .then(response => response.json())
      .then(data => {
        defaultTabs = data;
      })
  ]);
}

// Load user settings and tabs from storage
function loadUserData() {
  return browser.storage.local.get(['userSettings', 'userTabs', 'activeTabId']).then(result => {
    userSettings = result.userSettings || {};
    userTabs = result.userTabs || [];
    activeTabId = result.activeTabId || null;
  });
}

// Merge default and user data
function mergeData() {
  settings = deepMerge(JSON.parse(JSON.stringify(defaultSettings)), userSettings);
  tabs = mergeTabs(JSON.parse(JSON.stringify(defaultTabs)), userTabs);

  // Set active tab
  if (!activeTabId && tabs.length > 0) {
    activeTabId = tabs[0].tabId;
  }
}

// Deep merge function for settings
function deepMerge(target, source) {
  for (let key in source) {
    if (source[key] && typeof source[key] === 'object') {
      target[key] = deepMerge(target[key] || {}, source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}

// Merge tabs with handling for new properties
function mergeTabs(defaultTabs, userTabs) {
  const mergedTabs = [];

  // Add user-defined tabs
  userTabs.forEach(userTab => {
    mergedTabs.push(userTab);
  });

  // Add default tabs only if there are no user tabs
  if (mergedTabs.length === 0) {
    defaultTabs.forEach(defaultTab => {
      mergedTabs.push(defaultTab);
    });
  }

  return mergedTabs;
}

// Save user settings and tabs
function saveUserData() {
  return browser.storage.local.set({
    userSettings: userSettings,
    userTabs: userTabs,
    activeTabId: activeTabId
  });
}

// Shared functions
function removeContextMenus() {
  const menus = document.querySelectorAll('.context-menu');
  menus.forEach(menu => menu.remove());
}

function initializeTabs() {
  const tabsContainer = document.getElementById('tabs');
  tabsContainer.innerHTML = '';

  tabs.forEach((tab, index) => {
    const tabElement = document.createElement('div');
    tabElement.className = 'tab';
    tabElement.dataset.tabId = tab.tabId;
    tabElement.textContent = tab.tabName || 'My Bookmarks';
    if (tab.tabId === activeTabId) {
      tabElement.classList.add('active');
    }

    tabElement.addEventListener('click', () => {
      activeTabId = tab.tabId;
      saveUserData().then(() => {
        renderTabs();
        renderSections();
      });
    });

    // Right-click context menu for tab
    tabElement.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      removeContextMenus(); // Remove existing context menus
      showTabContextMenu(e.pageX, e.pageY, index);
    });

    tabsContainer.appendChild(tabElement);
  });

  // Make tabs sortable
  Sortable.create(tabsContainer, {
    animation: 150,
    onEnd: (evt) => {
      const oldIndex = evt.oldIndex;
      const newIndex = evt.newIndex;
      tabs.splice(newIndex, 0, tabs.splice(oldIndex, 1)[0]);
      userTabs = tabs; // Update userTabs
      saveUserData().then(() => {
        renderTabs();
      });
    }
  });

  // Update tab width
  updateTabWidth();
}

function renderTabs() {
  initializeTabs(); // Re-initialize tabs to reflect any changes
}

function updateTabWidth() {
  const tabWidth = settings.tabWidth || 120; // Default to 120 if not set
  document.documentElement.style.setProperty('--tab-width', `${tabWidth}px`);
  document.documentElement.style.setProperty('--half-tab-width', `${tabWidth / 2}px`);
}

// Expose variables and functions to other scripts
window.settings = settings;
window.tabs = tabs;
window.userSettings = userSettings;
window.userTabs = userTabs;
window.saveUserData = saveUserData;
window.removeContextMenus = removeContextMenus;
window.activeTabId = activeTabId;
window.initializeTabs = initializeTabs;
window.renderTabs = renderTabs;
window.updateTabWidth = updateTabWidth;
