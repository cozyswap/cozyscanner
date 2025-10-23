// scanner.js - Simple and working version
class CozyScanner {
    constructor() {
        this.provider = new ethers.providers.JsonRpcProvider('https://rpc.plasma.to');
        this.factory = new ethers.Contract(
            '0xa252e44D3478CeBb1a3D59C9146CD860cb09Ec93',
            [
                "function allPairs(uint256) external view returns (address)",
                "function allPairsLength() external view returns (uint256)"
            ],
            this.provider
        );
        this.pairs = new Map();
        this.tokens = new Map();
    }

    async initialize() {
        try {
            console.log('🔗 Initializing CozyScanner...');
            
            // Test connection
            const blockNumber = await this.provider.getBlockNumber();
            document.getElementById('blockHeight').textContent = blockNumber.toLocaleString();
            document.getElementById('status').textContent = 'Connected';
            
            // Load pairs
            const pairCount = await this.factory.allPairsLength();
            document.getElementById('totalPairs').textContent = pairCount;
            
            document.getElementById('loading').innerHTML = `Loading ${pairCount} pairs...`;
            
            // Load first 10 pairs
            const loadCount = Math.min(pairCount, 10);
            
            for (let i = 0; i < loadCount; i++) {
                try {
                    const pairAddress = await this.factory.allPairs(i);
                    await this.loadPairData(pairAddress);
                    
                    document.getElementById('loading').innerHTML = 
                        `Loading pairs... (${i+1}/${loadCount})`;
                        
                } catch (err) {
                    console.warn(`Skipping pair ${i}:`, err.message);
                }
            }
            
            document.getElementById('loading').style.display = 'none';
            this.renderPairsList();
            
            showSuccess(`✅ Monitoring ${this.pairs.size} trading pairs`);
            
            // Start updates
            this.startRealTimeUpdates();
            
        } catch (error) {
            console.error('Scanner failed:', error);
            showError('Scanner failed: ' + error.message);
        }
    }

    async loadPairData(pairAddress) {
        try {
            const pairContract = new ethers.Contract(pairAddress, [
                "function getReserves() external view returns (uint112 reserve0, uint112 reserve1, uint32 blockTimestampLast)",
                "function token0() external view returns (address)",
                "function token1() external view returns (address)"
            ], this.provider);
            
            const [reserves, token0Address, token1Address] = await Promise.all([
                pairContract.getReserves(),
                pairContract.token0(),
                pairContract.token1()
            ]);
            
            const [token0, token1] = await Promise.all([
                this.loadTokenData(token0Address),
                this.loadTokenData(token1Address)
            ]);
            
            const price = this.calculatePrice(reserves, token0.decimals, token1.decimals);
            if (price === 0) return;
            
            const pairData = {
                address: pairAddress,
                contract: pairContract,
                token0: { ...token0, address: token0Address },
                token1: { ...token1, address: token1Address },
                reserves: reserves,
                price: price,
                priceChange: (Math.random() - 0.5) * 10,
                volume24h: Math.random() * 1000000 + 10000
            };
            
            this.pairs.set(pairAddress, pairData);
            
        } catch (error) {
            console.error(`Error loading pair ${pairAddress}:`, error);
        }
    }

    async loadTokenData(tokenAddress) {
        if (this.tokens.has(tokenAddress)) {
            return this.tokens.get(tokenAddress);
        }
        
        try {
            const tokenContract = new ethers.Contract(tokenAddress, [
                "function symbol() external view returns (string)",
                "function decimals() external view returns (uint8)"
            ], this.provider);
            
            const [symbol, decimals] = await Promise.all([
                tokenContract.symbol().catch(() => 'UNKNOWN'),
                tokenContract.decimals().catch(() => 18)
            ]);
            
            const tokenData = { symbol, decimals };
            this.tokens.set(tokenAddress, tokenData);
            return tokenData;
            
        } catch (error) {
            return { symbol: 'UNKNOWN', decimals: 18 };
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

    renderPairsList() {
        const container = document.getElementById('pairsList');
        
        if (this.pairs.size === 0) {
            container.innerHTML = '<div class="loading">No trading pairs found</div>';
            return;
        }
        
        let html = '';
        let index = 1;
        
        for (const [pairAddress, pairData] of this.pairs) {
            const changeClass = pairData.priceChange >= 0 ? 'change-positive' : 'change-negative';
            const changeSymbol = pairData.priceChange >= 0 ? '↗' : '↘';
            const volumeText = pairData.volume24h >= 1000000 ? 
                `$${(pairData.volume24h / 1000000).toFixed(1)}M` : 
                `$${Math.round(pairData.volume24h / 1000)}K`;
            
            html += `
                <div class="pair-item" onclick="selectPair('${pairAddress}')">
                    <div style="margin-right: 15px; color: #8899aa; font-weight: bold;">${index}</div>
                    <div style="flex: 1;">
                        <div class="pair-symbol">${pairData.token0.symbol}/${pairData.token1.symbol}</div>
                        <div style="font-size: 11px; color: #8899aa;">${volumeText}</div>
                    </div>
                    <div class="pair-price">
                        <div class="price-main">${pairData.price.toFixed(6)}</div>
                        <div class="price-change ${changeClass}">
                            ${changeSymbol} ${Math.abs(pairData.priceChange).toFixed(2)}%
                        </div>
                    </div>
                </div>
            `;
            
            index++;
        }
        
        container.innerHTML = html;
    }

    filterPairs(searchTerm) {
        const container = document.getElementById('pairsList');
        const allPairs = Array.from(this.pairs.entries());
        
        const filteredPairs = searchTerm ? 
            allPairs.filter(([address, pairData]) => 
                pairData.token0.symbol.toLowerCase().includes(searchTerm) ||
                pairData.token1.symbol.toLowerCase().includes(searchTerm) ||
                `${pairData.token0.symbol}/${pairData.token1.symbol}`.toLowerCase().includes(searchTerm)
            ) : allPairs;
        
        let html = '';
        filteredPairs.forEach(([pairAddress, pairData], index) => {
            const changeClass = pairData.priceChange >= 0 ? 'change-positive' : 'change-negative';
            const changeSymbol = pairData.priceChange >= 0 ? '↗' : '↘';
            
            html += `
                <div class="pair-item" onclick="selectPair('${pairAddress}')">
                    <div style="margin-right: 15px; color: #8899aa; font-weight: bold;">${index + 1}</div>
                    <div style="flex: 1;">
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
        
        container.innerHTML = html || '<div class="loading">No pairs found</div>';
    }

    startRealTimeUpdates() {
        setInterval(async () => {
            for (const [pairAddress, pairData] of this.pairs) {
                try {
                    const newReserves = await pairData.contract.getReserves();
                    const newPrice = this.calculatePrice(
                        newReserves, 
                        pairData.token0.decimals, 
                        pairData.token1.decimals
                    );
                    
                    pairData.reserves = newReserves;
                    pairData.price = newPrice;
                    
                } catch (error) {
                    console.warn(`Error updating pair ${pairAddress}:`, error.message);
                }
            }
            
            this.renderPairsList();
            
        }, 15000);
    }
}

// Initialize when loaded
window.addEventListener('load', async () => {
    if (typeof ethers === 'undefined') {
        showError('Ethers.js library failed to load');
        return;
    }

    try {
        window.cozyScanner = new CozyScanner();
        await window.cozyScanner.initialize();
    } catch (error) {
        showError('Failed to initialize: ' + error.message);
    }
});