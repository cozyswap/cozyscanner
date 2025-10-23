// charts.js - Chart Management System
class ChartManager {
    constructor() {
        this.chart = null;
        this.chartData = new Map();
        this.currentTimeframe = '1h';
        this.currentPair = null;
    }

    async loadPairChart(pairAddress, pairData) {
        try {
            console.log('📈 Loading chart for:', pairAddress);
            this.currentPair = pairAddress;
            
            // Show loading state
            document.getElementById('chartLoading').style.display = 'block';
            
            // Generate or get chart data
            let data = this.chartData.get(pairAddress);
            if (!data) {
                data = this.generateChartData(pairData.price);
                this.chartData.set(pairAddress, data);
            }
            
            // Simulate loading delay for better UX
            await this.delay(800);
            
            // Render chart
            this.renderChart(pairData, data);
            
            // Hide loading
            document.getElementById('chartLoading').style.display = 'none';
            
        } catch (error) {
            console.error('Error loading chart:', error);
            document.getElementById('chartLoading').innerHTML = 
                '<div class="error">❌ Failed to load chart data</div>';
        }
    }

    generateChartData(basePrice) {
        const data = [];
        let currentPrice = basePrice;
        const now = Date.now();
        const dataPoints = window.CONFIG.APP.CHART_DATA_POINTS;
        
        // Generate realistic price movement
        for (let i = dataPoints; i >= 0; i--) {
            const time = now - (i * 60000); // 1 minute intervals
            // More realistic price movement with momentum
            const volatility = 0.008; // 0.8% volatility
            const change = (Math.random() - 0.5) * volatility;
            currentPrice = currentPrice * (1 + change);
            
            data.push({
                time: time,
                price: Math.max(currentPrice, 0.000001), // Prevent negative prices
                volume: Math.random() * 10000 + 1000
            });
        }
        
        return data;
    }

    renderChart(pairData, chartData) {
        const ctx = document.getElementById('priceChart').getContext('2d');
        
        // Destroy existing chart
        if (this.chart) {
            this.chart.destroy();
        }
        
        const prices = chartData.map(d => d.price);
        const timestamps = chartData.map(d => new Date(d.time));
        const priceChange = ((prices[prices.length-1] - prices[0]) / prices[0]) * 100;
        const isPositive = priceChange >= 0;
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: timestamps,
                datasets: [{
                    label: `${pairData.token0.symbol}/${pairData.token1.symbol}`,
                    data: prices,
                    borderColor: isPositive ? '#00ff88' : '#ff4444',
                    backgroundColor: isPositive ? 
                        'rgba(0, 255, 136, 0.1)' : 'rgba(255, 68, 68, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 0,
                    pointHoverRadius: 4,
                    pointBackgroundColor: isPositive ? '#00ff88' : '#ff4444',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    intersect: false,
                    mode: 'index'
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(26, 26, 46, 0.95)',
                        titleColor: '#8899aa',
                        bodyColor: '#ffffff',
                        borderColor: '#2a2a4a',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                return `Price: ${context.parsed.y.toFixed(6)}`;
                            },
                            title: function(tooltipItems) {
                                const date = new Date(tooltipItems[0].parsed.x);
                                return date.toLocaleTimeString();
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'minute',
                            displayFormats: {
                                minute: 'HH:mm'
                            }
                        },
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                        },
                        ticks: {
                            color: '#8899aa',
                            maxTicksLimit: 8,
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        position: 'right',
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                        },
                        ticks: {
                            color: '#8899aa',
                            callback: function(value) {
                                if (value < 0.001) {
                                    return value.toFixed(8);
                                } else if (value < 1) {
                                    return value.toFixed(6);
                                } else {
                                    return value.toFixed(4);
                                }
                            },
                            font: {
                                size: 11
                            }
                        }
                    }
                },
                elements: {
                    line: {
                        borderWidth: 2
                    }
                }
            }
        });
        
        // Update chart title with price info
        this.updateChartTitle(pairData, priceChange, isPositive);
    }

    updateChartData(pairAddress, newPrice) {
        if (pairAddress !== this.currentPair) return;
        
        const data = this.chartData.get(pairAddress);
        if (!data || !this.chart) return;
        
        // Add new data point
        data.push({
            time: Date.now(),
            price: newPrice,
            volume: Math.random() * 10000 + 1000
        });
        
        // Keep only the configured number of data points
        if (data.length > window.CONFIG.APP.CHART_DATA_POINTS) {
            data.shift();
        }
        
        // Update chart
        const prices = data.map(d => d.price);
        const timestamps = data.map(d => new Date(d.time));
        
        this.chart.data.labels = timestamps;
        this.chart.data.datasets[0].data = prices;
        
        // Update colors based on trend
        const priceChange = ((prices[prices.length-1] - prices[0]) / prices[0]) * 100;
        const isPositive = priceChange >= 0;
        
        this.chart.data.datasets[0].borderColor = isPositive ? '#00ff88' : '#ff4444';
        this.chart.data.datasets[0].backgroundColor = isPositive ? 
            'rgba(0, 255, 136, 0.1)' : 'rgba(255, 68, 68, 0.1)';
        this.chart.data.datasets[0].pointBackgroundColor = isPositive ? '#00ff88' : '#ff4444';
        
        this.chart.update('none');
        
        // Update title
        const pairData = window.CozyScanner.pairs.get(pairAddress);
        if (pairData) {
            this.updateChartTitle(pairData, priceChange, isPositive);
        }
    }

    updateChartTitle(pairData, priceChange, isPositive) {
        const changeColor = isPositive ? '#00ff88' : '#ff4444';
        const changeSymbol = isPositive ? '↗' : '↘';
        
        document.getElementById('chartTitle').innerHTML = 
            `${pairData.token0.symbol}/${pairData.token1.symbol} ` +
            `<span style="color: ${changeColor}; font-size: 16px; font-weight: 600;">
                ${pairData.price.toFixed(6)} • ${changeSymbol} ${Math.abs(priceChange).toFixed(2)}%
            </span>`;
    }

    changeTimeframe(timeframe) {
        this.currentTimeframe = timeframe;
        
        // Update active button
        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // In a real implementation, this would load different data
        // For now, we'll just log the change
        console.log('Timeframe changed to:', timeframe);
        
        if (this.currentPair) {
            // Simulate reloading with new timeframe
            document.getElementById('chartLoading').style.display = 'block';
            
            setTimeout(() => {
                const pairData = window.CozyScanner.pairs.get(this.currentPair);
                if (pairData) {
                    // Regenerate chart data for new timeframe
                    const newData = this.generateChartData(pairData.price);
                    this.chartData.set(this.currentPair, newData);
                    this.renderChart(pairData, newData);
                    document.getElementById('chartLoading').style.display = 'none';
                }
            }, 600);
        }
    }

    // Utility function for delays
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Initialize Chart Manager
window.ChartManager = new ChartManager();
console.log('📊 ChartManager module loaded');