// config.js - Configuration for CozyScanner
const CONFIG = {
    // Blockchain Configuration
    BLOCKCHAIN: {
        RPC_ENDPOINTS: [
            'https://rpc.plasma.to',
            'https://plasma-rpc.chainstack.com'
        ],
        CHAIN_ID: 9745,
        CHAIN_NAME: 'Plasma Network',
        BLOCK_TIME: 15, // seconds
        CONFIRMATIONS: 1
    },

    // Contract Addresses
    CONTRACTS: {
        FACTORY: '0xa252e44D3478CeBb1a3D59C9146CD860cb09Ec93',
        ROUTER: '0x89E695B38610e78a77Fb310458Dfd855505AD239',
        WXPL: '0x6100E367285b01F48D07953803A2d8dCA5D19873'
    },

    // Application Settings
    APP: {
        NAME: 'CozyScanner',
        VERSION: '1.0.0',
        DESCRIPTION: 'Real-time DEX Analytics on Plasma Network',
        UPDATE_INTERVAL: 15000, // 15 seconds
        MAX_PAIRS_DISPLAY: 25,
        CHART_DATA_POINTS: 50,
        SEARCH_DEBOUNCE: 300 // ms
    },

    // Feature Flags
    FEATURES: {
        REAL_TIME_UPDATES: true,
        PRICE_CHARTS: true,
        SEARCH_FILTERS: true,
        MOBILE_RESPONSIVE: true,
        ERROR_RECOVERY: true
    },

    // UI Configuration
    UI: {
        THEME: {
            primary: '#0f0f23',
            secondary: '#1a1a2e',
            accent: '#007bff',
            success: '#00ff88',
            error: '#ff4444'
        },
        ANIMATIONS: {
            enabled: true,
            duration: 300
        }
    }
};

// Export for browser
if (typeof window !== 'undefined') {
    window.CONFIG = CONFIG;
}

console.log('⚙️ CozyScanner Config Loaded:', CONFIG.APP.NAME, 'v' + CONFIG.APP.VERSION);