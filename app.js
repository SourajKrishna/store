// ========================================
// Legacy Verse Server Status App
// ========================================

class ServerStatusApp {
    constructor() {
        this.serverAddress = 'play.legacyverse.tech';
        this.serverPort = '25577';
        // Try multiple CORS proxy options
        this.apiUrls = [
            `https://corsproxy.io/?${encodeURIComponent(`https://api.mcsrvstat.us/2/${this.serverAddress}:${this.serverPort}`)}`,
            `https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.mcsrvstat.us/2/${this.serverAddress}:${this.serverPort}`)}`,
            `https://cors-anywhere.herokuapp.com/https://api.mcsrvstat.us/2/${this.serverAddress}:${this.serverPort}`
        ];
        this.currentApiIndex = 0;
        this.updateInterval = 25000; // 25 seconds
        this.chart = null;
        this.uptimeData = this.loadUptimeData();
        this.components = [
            { id: 'login', name: 'Login System', icon: 'user-check' },
            { id: 'chat', name: 'Chat System', icon: 'message-circle' },
            { id: 'iph', name: 'Items Per Hour', icon: 'package' },
            { id: 'events', name: 'Events System', icon: 'calendar' },
            { id: 'ddos', name: 'DDoS Protection', icon: 'shield' },
            { id: 'website', name: 'Website', icon: 'globe' }
        ];
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.initChart();
        await this.updateServerStatus();
        this.startAutoUpdate();
        this.updateComponentStatuses();
    }

    setupEventListeners() {
        // Add click handlers for component cards
        document.querySelectorAll('.component-card').forEach(card => {
            card.addEventListener('click', () => {
                this.animateComponentCard(card);
            });
        });

        // Add keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (e.key === 'r' || e.key === 'R') {
                if (e.ctrlKey || e.metaKey) {
                    e.preventDefault();
                    this.refreshStatus();
                }
            }
        });
    }

    async updateServerStatus() {
        let lastError = null;
        
        // Try multiple CORS proxies
        for (let i = 0; i < this.apiUrls.length; i++) {
            const currentIndex = (this.currentApiIndex + i) % this.apiUrls.length;
            const apiUrl = this.apiUrls[currentIndex];
            
            try {
                this.showLoadingState();
                console.log(`Attempting API ${currentIndex + 1}:`, apiUrl);
                
                const response = await fetch(apiUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json',
                    },
                    // Add timeout
                    signal: AbortSignal.timeout(10000)
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                
                const responseData = await response.json();
                console.log('Raw response:', responseData);
                
                let serverData;
                
                // Handle different proxy response formats
                if (currentIndex === 0) {
                    // corsproxy.io returns data directly
                    serverData = responseData;
                } else if (currentIndex === 1) {
                    // allorigins.win wraps in contents
                    serverData = JSON.parse(responseData.contents);
                } else {
                    // cors-anywhere returns data directly
                    serverData = responseData;
                }
                
                console.log('Parsed server data:', serverData);
                
                this.processServerData(serverData);
                this.hideErrorToast();
                this.currentApiIndex = currentIndex; // Remember working API
                return; // Success, exit the loop
                
            } catch (error) {
                console.error(`API ${currentIndex + 1} failed:`, error);
                lastError = error;
                continue; // Try next API
            }
        }
        
        // All APIs failed
        console.error('All APIs failed. Last error:', lastError);
        this.showErrorState();
        this.showErrorToast('All server status APIs are unavailable. Using mock data...');
        
        // Show mock data as fallback
        this.showMockData();
    }

    showMockData() {
        console.log('Showing mock data as API fallback');
        const mockData = {
            online: true,
            players: {
                online: 1,
                max: 55,
                list: ['Raphex']
            },
            version: '1.20.2',
            motd: {
                clean: ['Legacy Verse - Season 3', 'The adventure continues...']
            }
        };
        
        this.processServerData(mockData);
    }

    processServerData(data) {
        const isOnline = data.online;
        const playersOnline = isOnline ? data.players.online : 0;
        const maxPlayers = isOnline ? data.players.max : 0;
        const version = isOnline ? data.version : 'Unknown';
        const playersList = isOnline && data.players.list ? data.players.list : [];

        // Update hero stats
        this.updateHeroStats(playersOnline, maxPlayers, version);
        
        // Update platform badges
        this.updatePlatformBadges(isOnline);
        
        // Update online players list
        this.updatePlayersList(playersList);
        
        // Record uptime data
        this.recordUptimeData(isOnline);
        
        // Update chart
        this.updateChart();

        // Remove loading states
        this.hideLoadingState();
    }

    updateHeroStats(playersOnline, maxPlayers, version) {
        const playersElement = document.getElementById('playersOnline');
        const maxPlayersElement = document.getElementById('maxSlots');
        const versionElement = document.getElementById('serverVersion');

        if (playersElement) {
            this.animateNumber(playersElement, playersOnline);
        }
        
        if (maxPlayersElement) {
            this.animateNumber(maxPlayersElement, maxPlayers);
        }
        
        if (versionElement) {
            versionElement.textContent = version;
        }
    }

    updatePlatformBadges(isOnline) {
        const javaBadge = document.querySelector('.java-badge .status-dot');
        const bedrockBadge = document.querySelector('.bedrock-badge .status-dot');
        
        if (javaBadge) {
            javaBadge.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
        }
        
        if (bedrockBadge) {
            bedrockBadge.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
        }
    }

    updatePlayersList(playersList) {
        const playersContainer = document.getElementById('playersContainer');
        
        if (!playersContainer) return;

        if (playersList.length === 0) {
            playersContainer.innerHTML = '<p class="no-players">No players currently online</p>';
        } else {
            const playersHTML = playersList.map(player => 
                `<span class="player-badge">${this.escapeHtml(player.name || player)}</span>`
            ).join('');
            playersContainer.innerHTML = `<div class="players-list">${playersHTML}</div>`;
        }
    }

    updateComponentStatuses() {
        // Simulate component statuses based on server status
        this.components.forEach(component => {
            const card = document.querySelector(`[data-component="${component.id}"]`);
            if (!card) return;

            const statusDot = card.querySelector('.status-dot');
            const statusText = card.querySelector('.status-text');
            
            if (statusDot && statusText) {
                // Simulate some components being online/offline
                const isOnline = Math.random() > 0.1; // 90% chance of being online
                
                statusDot.className = `status-dot ${isOnline ? 'online' : 'offline'}`;
                statusText.textContent = isOnline ? 'Operational' : 'Offline';
            }
        });
    }

    recordUptimeData(isOnline) {
        const now = new Date();
        const timeKey = now.toISOString().split(':')[0] + ':00'; // Round to nearest hour
        
        this.uptimeData[timeKey] = isOnline ? 100 : 0;
        
        // Keep only last 24 hours of data
        const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        Object.keys(this.uptimeData).forEach(key => {
            if (new Date(key) < cutoff) {
                delete this.uptimeData[key];
            }
        });
        
        this.saveUptimeData();
    }

    initChart() {
        const ctx = document.getElementById('uptimeChart');
        if (!ctx) return;

        const gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(43, 209, 106, 0.3)');
        gradient.addColorStop(1, 'rgba(43, 209, 106, 0.05)');

        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Server Uptime %',
                    data: [],
                    borderColor: '#2bd16a',
                    backgroundColor: gradient,
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#2bd16a',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: '#242629',
                        titleColor: '#ffffff',
                        bodyColor: '#a0a0a0',
                        borderColor: '#2bd16a',
                        borderWidth: 1,
                        cornerRadius: 8,
                        displayColors: false,
                        callbacks: {
                            label: function(context) {
                                return `Uptime: ${context.parsed.y.toFixed(1)}%`;
                            }
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 96,
                        max: 100,
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                        },
                        ticks: {
                            color: '#a0a0a0',
                            callback: function(value) {
                                return value.toFixed(1) + '%';
                            }
                        }
                    },
                    x: {
                        grid: {
                            color: 'rgba(255, 255, 255, 0.1)',
                            borderColor: 'rgba(255, 255, 255, 0.2)'
                        },
                        ticks: {
                            color: '#a0a0a0',
                            maxTicksLimit: 12,
                            callback: function(value, index, values) {
                                const label = this.getLabelForValue(value);
                                return new Date(label).toLocaleTimeString('en-US', { 
                                    hour: 'numeric',
                                    hour12: true 
                                });
                            }
                        }
                    }
                },
                elements: {
                    point: {
                        hoverBackgroundColor: '#2bd16a'
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });

        this.updateChart();
    }

    updateChart() {
        if (!this.chart) return;

        const sortedData = Object.entries(this.uptimeData)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .slice(-24); // Last 24 hours

        const labels = sortedData.map(([time]) => time);
        const data = sortedData.map(([, uptime]) => uptime);

        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = data;
        this.chart.update('none');
    }

    showLoadingState() {
        const elements = [
            document.getElementById('playersOnline'),
            document.getElementById('maxSlots'),
            document.getElementById('serverVersion')
        ];

        elements.forEach(el => {
            if (el) el.classList.add('loading');
        });
    }

    hideLoadingState() {
        const elements = [
            document.getElementById('playersOnline'),
            document.getElementById('maxSlots'),
            document.getElementById('serverVersion')
        ];

        elements.forEach(el => {
            if (el) el.classList.remove('loading');
        });
    }

    showErrorState() {
        const playersElement = document.getElementById('playersOnline');
        const maxPlayersElement = document.getElementById('maxSlots');
        const versionElement = document.getElementById('serverVersion');

        if (playersElement) playersElement.textContent = '0';
        if (maxPlayersElement) maxPlayersElement.textContent = '0';
        if (versionElement) versionElement.textContent = 'Offline';

        // Update platform badges to offline
        this.updatePlatformBadges(false);
        
        // Clear players list
        const playersContainer = document.getElementById('playersContainer');
        if (playersContainer) {
            playersContainer.innerHTML = '<p class="no-players">Server is currently offline</p>';
        }
    }

    showErrorToast(message) {
        const existingToast = document.querySelector('.toast');
        if (existingToast) {
            existingToast.remove();
        }

        const toast = document.createElement('div');
        toast.className = 'toast error-toast';
        toast.innerHTML = `
            <div class="toast-content">
                <i data-feather="alert-circle"></i>
                <span>${this.escapeHtml(message)}</span>
            </div>
        `;

        document.body.appendChild(toast);
        
        // Replace feather icons
        feather.replace();

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Auto hide after 5 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
    }

    hideErrorToast() {
        const toast = document.querySelector('.toast');
        if (toast) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }

    animateNumber(element, targetNumber) {
        const currentNumber = parseInt(element.textContent) || 0;
        const increment = (targetNumber - currentNumber) / 20;
        let current = currentNumber;

        const animation = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= targetNumber) || 
                (increment < 0 && current <= targetNumber)) {
                current = targetNumber;
                clearInterval(animation);
            }
            element.textContent = Math.round(current);
        }, 50);
    }

    animateComponentCard(card) {
        card.classList.add('updating');
        setTimeout(() => {
            card.classList.remove('updating');
        }, 500);
    }

    async refreshStatus() {
        this.showLoadingState();
        await this.updateServerStatus();
        this.updateComponentStatuses();
    }

    startAutoUpdate() {
        setInterval(() => {
            this.updateServerStatus();
            this.updateComponentStatuses();
        }, this.updateInterval);
    }

    loadUptimeData() {
        try {
            const stored = localStorage.getItem('legacyverse_uptime');
            return stored ? JSON.parse(stored) : {};
        } catch (error) {
            console.error('Error loading uptime data:', error);
            return {};
        }
    }

    saveUptimeData() {
        try {
            localStorage.setItem('legacyverse_uptime', JSON.stringify(this.uptimeData));
        } catch (error) {
            console.error('Error saving uptime data:', error);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Public methods for manual control
    async forceUpdate() {
        await this.refreshStatus();
    }

    getServerData() {
        return {
            address: this.serverAddress,
            port: this.serverPort,
            uptimeData: this.uptimeData,
            lastUpdate: new Date().toISOString()
        };
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Initialize feather icons
    feather.replace();
    
    // Create the app instance
    window.serverStatusApp = new ServerStatusApp();
    
    // Add some sample incident data
    addSampleIncidents();
    
    // Add keyboard shortcuts info to console
    console.log('🚀 Legacy Verse Server Status loaded!');
    console.log('💡 Keyboard shortcuts:');
    console.log('   Ctrl+R / Cmd+R - Refresh server status');
    console.log('🔧 Access app instance via: window.serverStatusApp');
});

// Sample incident data function
function addSampleIncidents() {
    const incidentsList = document.querySelector('.incidents-list');
    if (!incidentsList) return;

    const incidents = [
        {
            title: 'Scheduled Maintenance',
            description: 'Server maintenance completed successfully. All systems are now fully operational.',
            date: '2024-01-15',
            time: '2h ago',
            icon: 'check-circle'
        },
        {
            title: 'Plugin Update',
            description: 'Updated core plugins and added new features. Minor downtime during deployment.',
            date: '2024-01-14',
            time: '1 day ago',
            icon: 'download'
        },
        {
            title: 'Performance Optimization',
            description: 'Improved server performance and reduced lag. Players should notice smoother gameplay.',
            date: '2024-01-12',
            time: '3 days ago',
            icon: 'zap'
        }
    ];

    const incidentsHTML = incidents.map(incident => `
        <div class="incident-item">
            <div class="incident-icon">
                <i data-feather="${incident.icon}"></i>
            </div>
            <div class="incident-content">
                <div class="incident-title">${incident.title}</div>
                <div class="incident-description">${incident.description}</div>
                <div class="incident-date">${incident.date}</div>
            </div>
            <div class="incident-time">${incident.time}</div>
        </div>
    `).join('');

    incidentsList.innerHTML = incidentsHTML;
    
    // Re-initialize feather icons for the new content
    feather.replace();
}

// Export for potential module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ServerStatusApp;
}