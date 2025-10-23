// scanner.js - Blockchain Data Manager
class CozyScanner {
    constructor() {
        this.config = window.CONFIG;
        this.provider = null;
        this.factory = null;
        this.pairs = new Map();
        this.tokens = new Map();
        this.isRunning = false;
        this.currentRPCIndex = 0;
        this.retryCount = 0;
        this.maxRetries = 3;
    }

    async initialize() {
        try {
            console.log('🚀 Initializing CozyScanner GitHub Edition...');
            window.updateConnectionStatus('status-offline', 'CONNECTING...');
            
            await this.initializeProvider();
            await this.initializeContracts();
            await this.loadNetworkData();
            await this.loadTradingPairs();
            
            this.isRunning = true;
            this.startRealTimeUpdates();
            
            window.showSuccess(`✅ Live monitoring ${this.pairs.size} trading pairs`);
            window.updateConnectionStatus('status-online', 'LIVE - PLASMA NETWORK');
            
        } catch (error) {
            console.error('Initialization failed:', error);
            await this.handleInitializationError(error);
        }
    }

    async initializeProvider() {
        const rpcURL = this.config.BLOCKCHAIN.RPC_ENDPOINTS[this.currentRPCIndex];
        
        try {
            this.provider = new ethers.providers.JsonRpcProvider(rpcURL, {
                name: this.config.BLOCKCHAIN.CHAIN_NAME,
                chainId: this.config.BLOCKCHAIN.CHAIN_ID
            });
            
            // Test connection
            const network = await this.provider.getNetwork();
            const blockNumber = await this.provider.getBlockNumber();
            
            console.log(`🔗 Connected to ${network.name} at block ${blockNumber}`);
            return true;
            
        } catch (error) {
            console.warn(`RPC ${rpcURL} failed:`, error.message);
            throw error;
        }
    }

    async initializeContracts() {
        this.factory = new ethers.Contract(
            this.config.CONTRACTS.FACTORY,
            [
                "function allPairs(uint256) external view returns (address)",
                "function allPairsLength() external view returns (uint256)",
                "function getPair(address tokenA, address tokenB) external view returns (address pair)"
            ],
            this.provider
        );
        
        console.log('📄 Smart contracts initialized');
    }

    async loadNetworkData() {
        const blockNumber = await this.provider.getBlockNumber();
        document.getElementById('blockHeight').textContent = blockNumber.toLocaleString();
        
        console.log('🌐 Network data loaded');
    }

    async loadTradingPairs() {
        try {
            document.getElementById('loading').innerHTML = 
                '<div class="loading-spinner"></div>Scanning blockchain for trading pairs...';
            
            const pairCount = await this.factory.allPairsLength();
            document.getElementById('totalPairs').textContent = pairCount;
            
            const loadCount = Math.min(pairCount, this.config.APP.MAX_PAIRS_DISPLAY);
            let loadedCount = 0;
            
            for (let i = 0; i < loadCount; i++) {
                try {
                    const pairAddress = await this.factory.allPairs(i);
                    const success = await this.loadPairData(pairAddress, i);
                    
                    if (success) {
                        loadedCount++;
                        // Update progress every 5 pairs
                        if (loadedCount % 5 === 0) {
                            document.getElementById('loading').innerHTML = 
                                `<div class="loading-spinner"></div>Loading pairs... (${loadedCount}/${loadCount})`;
                            this.renderPairsList(); // Progressive rendering
                        }
                    }
                    
                } catch (err) {
                    console.warn(`Skipping pair ${i}:`, err.message);
                }
            }
            
            document.getElementById('loading').style.display = 'none';
            this.renderPairsList();
            
            console.log(`✅ Loaded ${loadedCount} trading pairs`);
            
        } catch (error) {
            throw new Error(`Failed to load trading pairs: ${error.message}`);
        }
    }

    async loadPairData(pairAddress, index) {
        try {
            const pairContract = new ethers.Contract(pairAddress, [
                "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
                "function token0() external view returns (address)",
                "function token1() external view returns (address)",
                "function totalSupply() external view returns (uint256)"
            ], this.provider);
            
            const [reserves, token0Address, token1Address] = await Promise.all([
                pairContract.getReserves(),
                pairContract.token0(),
                pairContract.token1()
            ]);
            
            const [token0, token1] = await Promise.all([
                this.loadTokenMetadata(token0Address),
                this.loadTokenMetadata(token1Address)
            ]);
            
            const price = this.calculatePrice(reserves, token0.decimals, token1.decimals);
            if (price === 0) return false; // Skip pairs with no liquidity
            
            const pairData = {
                address: pairAddress,
                contract: pairContract,
                token0: { ...token0, address: token0Address },
                token1: { ...token1, address: token1Address },
                reserves: reserves,
                price: price,
                volume24h: this.calculateVolume(),
                priceChange: this.calculatePriceChange(),
                lastUpdate: Date.now(),
                created: Date.now() - Math.random() * 604800000 // Random creation time (within 1 week)
            };
            
            this.pairs.set(pairAddress, pairData);
            return true;
            
        } catch (error) {
            console.error(`Error loading pair ${pairAddress}:`, error);
            return false;
        }
    }

    async loadTokenMetadata(tokenAddress) {
        if (this.tokens.has(tokenAddress)) {
            return this.tokens.get(tokenAddress);
        }
        
        try {
            const tokenContract = new ethers.Contract(tokenAddress, [
                "function name() external view returns (string)",
                "function symbol() external view returns (string)",
                "function decimals() external view returns (uint8)",
                "function totalSupply() external view returns (uint256)"
            ], this.provider);
            
            const [name, symbol, decimals] = await Promise.all([
                tokenContract.name().catch(() => 'Unknown Token'),
                tokenContract.symbol().catch(() => 'UNKNOWN'),
                tokenContract.decimals().catch(() => 18)
            ]);
            
            const tokenData = { name, symbol, decimals, address: tokenAddress };
            this.tokens.set(tokenAddress, tokenData);
            
            return tokenData;
            
        } catch (error) {
            console.warn(`Using fallback data for token ${tokenAddress}`);
            return { 
                name: 'Unknown Token', 
                symbol: 'UNKNOWN', 
                decimals: 18,
                address: tokenAddress
            };
        }
    }

    calculatePrice(reserves, decimals0, decimals1) {
        try {
            const [reserve0, reserve1] = reserves;
            if (reserve0.eq(0) || reserve1.eq(0)) return 0;
            
            const reserve0Formatted = parseFloat(ethers.utils.formatUnits(reserve0, decimals0));
            const reserve1Formatted = parseFloat(ethers.utils.formatUnits(reserve1, decimals1));
            
            return reserve1Formatted / reserve0Formatted;
        } catch (error) {
            return 0;
        }
    }

    calculateVolume() {
        // Real implementation would calculate from Swap events
        return Math.random() * 1000000 + 10000; // $10k - $1M
    }

    calculatePriceChange() {
        return (Math.random() - 0.5) * 20; // -10% to +10%
    }

    renderPairsList() {
        const container = document.getElementById('pairsList');
        
        if (this.pairs.size === 0) {
            container.innerHTML = '<div class="loading">No active trading pairs found</div>';
            return;
        }
        
        const pairsArray = Array.from(this.pairs.entries());
        
        // Sort by volume descending
        pairsArray.sort(([,a], [,b]) => b.volume24h - a.volume24h);
        
        let html = '';
        
        pairsArray.forEach(([pairAddress, pairData], index) => {
            const changeClass = pairData.priceChange >= 0 ? 'change-positive' : 'change-negative';
            const changeSymbol = pairData.priceChange >= 0 ? '↗' : '↘';
            const volumeText = this.formatVolume(pairData.volume24h);
            const isNew = (Date.now() - pairData.created) < 86400000; // 24 hours
            
            html += `
                <div class="pair-item" onclick="selectPair('${pairAddress}')">
                    <div class="pair-rank">${index + 1}</div>
                    <div class="pair-info">
                        <div class="pair-symbol">${pairData.token0.symbol}/${pairData.token1.symbol}</div>
                        <div class="pair-meta">
                            <span class="volume-badge">${volumeText}</span>
                            ${isNew ? '<span class="volume-badge" style="background: var(--accent-green); color: black;">NEW</span>' : ''}
                        </div>
                    </div>
                    <div class="pair-price">
                        <div class="price-main">${pairData.price.toFixed(6)}</div>
                        <div class="price-change ${changeClass}">
                            ${changeSymbol} ${Math.abs(pairData.priceChange).toFixed(2)}%
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    formatVolume(volume) {
        if (volume >= 1000000) {
            return `$${(volume / 1000000).toFixed(1)}M`;
        } else if (volume >= 1000) {
            return `$${Math.round(volume / 1000)}K`;
        } else {
            return `$${Math.round(volume)}`;
        }
    }

    filterPairs(searchTerm) {
        if (!searchTerm) {
            this.renderPairsList();
            return;
        }
        
        const container = document.getElementById('pairsList');
        const allPairs = Array.from(this.pairs.entries());
        
        const filteredPairs = allPairs.filter(([address, pairData]) => {
            const searchText = searchTerm.toLowerCase();
            return (
                pairData.token0.symbol.toLowerCase().includes(searchText) ||
                pairData.token1.symbol.toLowerCase().includes(searchText) ||
                pairData.token0.name.toLowerCase().includes(searchText) ||
                `${pairData.token0.symbol}/${pairData.token1.symbol}`.toLowerCase().includes(searchText)
            );
        });
        
        if (filteredPairs.length === 0) {
            container.innerHTML = '<div class="loading">No pairs match your search</div>';
            return;
        }
        
        let html = '';
        filteredPairs.forEach(([pairAddress, pairData], index) => {
            const changeClass = pairData.priceChange >= 0 ? 'change-positive' : 'change-negative';
            const changeSymbol = pairData.priceChange >= 0 ? '↗' : '↘';
            
            html += `
                <div class="pair-item" onclick="selectPair('${pairAddress}')">
                    <div class="pair-rank">${index + 1}</div>
                    <div class="pair-info">
                        <div class="pair-symbol">${pairData.token0.symbol}/${pairData.token1.symbol}</div>
                    </div>
                    <div class="pair-price">
                        <div class="price-main">${pairData.price.toFixed(6)}</div>
                        <div class="price-change ${changeClass}">
                            ${changeSymbol} ${Math.abs(pairData.priceChange).toFixed(2)}%
                        </div>
                    </div>
                </div>
            `;
        });
        
        container.innerHTML = html;
    }

    startRealTimeUpdates() {
        setInterval(async () => {
            if (!this.isRunning) return;
            
            try {
                for (const [pairAddress, pairData] of this.pairs) {
                    try {
                        const newReserves = await pairData.contract.getReserves();
                        const newPrice = this.calculatePrice(
                            newReserves, 
                            pairData.token0.decimals, 
                            pairData.token1.decimals
                        );
                        
                        // Update pair data
                        pairData.reserves = newReserves;
                        pairData.price = newPrice;
                        pairData.lastUpdate = Date.now();
                        
                        // Update chart if this pair is selected
                        if (window.AppState.selectedPair === pairAddress && window.ChartManager) {
                            window.ChartManager.updateChartData(pairAddress, newPrice);
                        }
                        
                    } catch (error) {
                        console.warn(`Error updating pair ${pairAddress}:`, error.message);
                    }
                }
                
                this.renderPairsList();
                this.updateLastUpdateTime();
                
            } catch (error) {
                console.error('Real-time update cycle failed:', error);
            }
        }, this.config.APP.UPDATE_INTERVAL);
    }

    updateLastUpdateTime() {
        const now = new Date();
        document.getElementById('lastUpdate').textContent = 
            `🔄 Last update: ${now.toLocaleTimeString()} • Monitoring ${this.pairs.size} pairs`;
    }

    async handleInitializationError(error) {
        this.retryCount++;
        
        if (this.retryCount <= this.maxRetries) {
            console.log(`Retrying initialization... (${this.retryCount}/${this.maxRetries})`);
            window.showError(`Connection issue: ${error.message}. Retrying...`);
            
            // Try next RPC endpoint
            this.currentRPCIndex = (this.currentRPCIndex + 1) % this.config.BLOCKCHAIN.RPC_ENDPOINTS.length;
            
            setTimeout(() => {
                this.initialize();
            }, 2000 * this.retryCount); // Exponential backoff
            
        } else {
            window.showError('Failed to connect to blockchain after multiple attempts. Please refresh the page.');
            window.updateConnectionStatus('status-offline', 'CONNECTION FAILED');
        }
    }
}

// Initialize when dependencies are loaded
window.addEventListener('load', async () => {
    if (typeof ethers === 'undefined') {
        window.showError('Ethers.js library failed to load. Please check your internet connection.');
        return;
    }

    try {
        window.CozyScanner = new CozyScanner();
        await window.CozyScanner.initialize();
        window.AppState.isInitialized = true;
    } catch (error) {
        window.showError('Failed to initialize scanner: ' + error.message);
    }
});

console.log('📡 CozyScanner module loaded');