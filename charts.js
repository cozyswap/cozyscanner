// charts.js - Simple chart manager
class ChartManager {
    constructor() {
        this.chart = null;
        this.chartData = new Map();
    }

    loadPairChart(pairAddress, pairData) {
        try {
            console.log('📈 Loading chart for:', pairAddress);
            
            // Hide loading after delay
            setTimeout(() => {
                document.getElementById('chartLoading').style.display = 'none';
            }, 1000);
            
            // Generate chart data
            let data = this.chartData.get(pairAddress);
            if (!data) {
                data = this.generateChartData(pairData.price);
                this.chartData.set(pairAddress, data);
            }
            
            this.renderChart(pairData, data);
            
        } catch (error) {
            console.error('Chart error:', error);
            document.getElementById('chartLoading').innerHTML = '❌ Chart failed';
        }
    }

    generateChartData(basePrice) {
        const data = [];
        let currentPrice = basePrice;
        
        // Generate 20 data points
        for (let i = 0; i < 20; i++) {
            currentPrice = currentPrice * (1 + (Math.random() - 0.5) * 0.02);
            data.push({
                time: i,
                price: currentPrice
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
        const labels = chartData.map(d => `Point ${d.time + 1}`);
        const priceChange = ((prices[prices.length-1] - prices[0]) / prices[0]) * 100;
        const isPositive = priceChange >= 0;
        
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: `${pairData.token0.symbol}/${pairData.token1.symbol}`,
                    data: prices,
                    borderColor: isPositive ? '#00ff88' : '#ff4444',
                    backgroundColor: isPositive ? 'rgba(0, 255, 136, 0.1)' : 'rgba(255, 68, 68, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    x: {
                        grid: {
                            color: 'rgba(255,255,255,0.1)'
                        },
                        ticks: {
                            color: '#8899aa'
                        }
                    },
                    y: {
                        grid: {
                            color: 'rgba(255,255,255,0.1)'
                        },
                        ticks: {
                            color: '#8899aa',
                            callback: function(value) {
                                return value.toFixed(6);
                            }
                        }
                    }
                }
            }
        });
        
        // Update title
        document.getElementById('chartTitle').innerHTML = 
            `${pairData.token0.symbol}/${pairData.token1.symbol} ` +
            `<span style="color: ${isPositive ? '#00ff88' : '#ff4444'}">
                ${isPositive ? '↗' : '↘'} ${Math.abs(priceChange).toFixed(2)}%
            </span>`;
    }

    updateChartData(pairAddress, newPrice) {
        const data = this.chartData.get(pairAddress);
        if (!data || !this.chart) return;
        
        // Add new data point
        data.push({
            time: data.length,
            price: newPrice
        });
        
        // Remove first point if too many
        if (data.length > 20) {
            data.shift();
        }
        
        // Update chart
        const prices = data.map(d => d.price);
        const labels = data.map(d => `Point ${d.time + 1}`);
        
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = prices;
        
        // Update colors
        const priceChange = ((prices[prices.length-1] - prices[0]) / prices[0]) * 100;
        const isPositive = priceChange >= 0;
        
        this.chart.data.datasets[0].borderColor = isPositive ? '#00ff88' : '#ff4444';
        this.chart.data.datasets[0].backgroundColor = isPositive ? 
            'rgba(0, 255, 136, 0.1)' : 'rgba(255, 68, 68, 0.1)';
        
        this.chart.update();
    }

    changeTimeframe(timeframe) {
        console.log('Timeframe changed to:', timeframe);
        // Simple implementation - just log for now
    }
}

// Initialize chart manager
window.chartManager = new ChartManager();