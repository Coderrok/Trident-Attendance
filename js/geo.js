/**
 * Geolocation & Geofencing Engine
 * Enforces mandatory device GPS permission, calculates Haversine distance,
 * detects nearest construction sites, and evaluates geofence compliance.
 */

class GeoEngine {
    constructor() {
        this.currentPosition = null;
        this.permissionStatus = 'prompt'; // 'prompt', 'granted', 'denied', 'unavailable'
        this.watchId = null;
        this.listeners = [];
        this.mockMode = false;
        this.mockPosition = null;
        this.lastError = null;

        this.init();
    }

    async init() {
        // Check initial permission status if Permissions API is supported
        if (navigator.permissions && navigator.permissions.query) {
            try {
                const status = await navigator.permissions.query({ name: 'geolocation' });
                this.permissionStatus = status.state;
                status.onchange = () => {
                    this.permissionStatus = status.state;
                    this.notifyListeners();
                };
            } catch (e) {
                console.warn('Permissions query not supported:', e);
            }
        }

        // Immediately request GPS to enforce mandatory permission by default
        this.requestGPSPermission();
    }

    subscribe(callback) {
        this.listeners.push(callback);
        if (this.currentPosition || this.lastError) {
            callback(this.getState());
        }
    }

    notifyListeners() {
        const state = this.getState();
        this.listeners.forEach(cb => {
            try { cb(state); } catch (e) { console.error(e); }
        });
    }

    getState() {
        const pos = this.mockMode && this.mockPosition ? this.mockPosition : this.currentPosition;
        return {
            hasGPS: !!pos,
            permissionStatus: this.permissionStatus,
            position: pos,
            error: this.lastError,
            mockMode: this.mockMode
        };
    }

    /**
     * Mandatory GPS Request:
     * High accuracy, 10s timeout, zero cache age.
     */
    requestGPSPermission() {
        return new Promise((resolve, reject) => {
            if (!('geolocation' in navigator)) {
                this.permissionStatus = 'unavailable';
                this.lastError = 'Geolocation API is not supported by your browser/device.';
                this.notifyListeners();
                reject(new Error(this.lastError));
                return;
            }

            const options = {
                enableHighAccuracy: true,
                timeout: 12000,
                maximumAge: 0
            };

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    this.permissionStatus = 'granted';
                    this.lastError = null;
                    this.currentPosition = {
                        latitude: Number(pos.coords.latitude.toFixed(6)),
                        longitude: Number(pos.coords.longitude.toFixed(6)),
                        accuracy: Math.round(pos.coords.accuracy),
                        altitude: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
                        speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : null, // km/h
                        timestamp: new Date(pos.timestamp || Date.now())
                    };
                    this.startContinuousWatch();
                    this.notifyListeners();
                    resolve(this.currentPosition);
                },
                (err) => {
                    if (err.code === err.PERMISSION_DENIED) {
                        this.permissionStatus = 'denied';
                        this.lastError = 'Location access denied. GPS permission is MANDATORY for punch-in/out.';
                    } else if (err.code === err.POSITION_UNAVAILABLE) {
                        this.permissionStatus = 'unavailable';
                        this.lastError = 'GPS position unavailable. Please ensure device Location Services / GPS is turned ON.';
                    } else if (err.code === err.TIMEOUT) {
                        this.lastError = 'GPS satellite lock timed out. Retrying high-accuracy fix...';
                    } else {
                        this.lastError = err.message || 'Unknown GPS error';
                    }
                    this.notifyListeners();
                    reject(err);
                },
                options
            );
        });
    }

    startContinuousWatch() {
        if (this.watchId !== null) return;
        if (!('geolocation' in navigator)) return;

        this.watchId = navigator.geolocation.watchPosition(
            (pos) => {
                this.permissionStatus = 'granted';
                this.lastError = null;
                this.currentPosition = {
                    latitude: Number(pos.coords.latitude.toFixed(6)),
                    longitude: Number(pos.coords.longitude.toFixed(6)),
                    accuracy: Math.round(pos.coords.accuracy),
                    altitude: pos.coords.altitude ? Math.round(pos.coords.altitude) : null,
                    speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : null,
                    timestamp: new Date(pos.timestamp || Date.now())
                };
                this.notifyListeners();
            },
            (err) => {
                if (err.code === err.PERMISSION_DENIED) {
                    this.permissionStatus = 'denied';
                    this.lastError = 'GPS permission was revoked.';
                    this.notifyListeners();
                }
            },
            {
                enableHighAccuracy: true,
                maximumAge: 3000,
                timeout: 10000
            }
        );
    }

    /**
     * Haversine formula to compute great-circle distance in meters
     * between two coordinates.
     */
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth radius in meters
        const rad = Math.PI / 180;
        const φ1 = lat1 * rad;
        const φ2 = lat2 * rad;
        const Δφ = (lat2 - lat1) * rad;
        const Δλ = (lon2 - lon1) * rad;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return Math.round(R * c); // Distance in meters
    }

    /**
     * Evaluates current position against all construction sites.
     * Returns:
     * - nearestSite
     * - distanceMeters
     * - isWithinGeofence
     * - allSitesWithDistance sorted closest first
     */
    evaluateSites(sites) {
        const pos = this.getCurrentCoords();
        if (!pos || !sites || sites.length === 0) {
            return {
                nearestSite: null,
                distanceMeters: null,
                isWithinGeofence: false,
                allSites: []
            };
        }

        const evaluated = sites.map(site => {
            const dist = this.calculateDistance(pos.latitude, pos.longitude, site.latitude, site.longitude);
            const radius = site.radius || 150;
            const inside = dist <= radius;
            return {
                ...site,
                distanceMeters: dist,
                isInsideGeofence: inside,
                distanceFormatted: dist > 1000 ? `${(dist / 1000).toFixed(2)} km` : `${dist} m`
            };
        }).sort((a, b) => a.distanceMeters - b.distanceMeters);

        const nearest = evaluated[0];
        return {
            nearestSite: nearest,
            distanceMeters: nearest ? nearest.distanceMeters : null,
            isWithinGeofence: nearest ? nearest.isInsideGeofence : false,
            allSites: evaluated
        };
    }

    getCurrentCoords() {
        if (this.mockMode && this.mockPosition) {
            return this.mockPosition;
        }
        return this.currentPosition;
    }

    // Testing / Simulation Controls
    setMockLocation(preset, sites) {
        if (preset === 'real') {
            this.mockMode = false;
            this.mockPosition = null;
            this.lastError = null;
            this.requestGPSPermission();
            this.notifyListeners();
            return;
        }

        if (preset === 'denied') {
            this.mockMode = true;
            this.permissionStatus = 'denied';
            this.mockPosition = null;
            this.lastError = 'Location access denied by user settings (Simulated Error).';
            this.notifyListeners();
            return;
        }

        this.mockMode = true;
        this.permissionStatus = 'granted';
        this.lastError = null;

        const site1 = sites && sites[0] ? sites[0] : { latitude: 37.78985, longitude: -122.39955 };
        const site2 = sites && sites[1] ? sites[1] : { latitude: 37.76012, longitude: -122.38745 };

        if (preset === 'onsite-site1') {
            // Inside site 1 (approx 25m from center)
            this.mockPosition = {
                latitude: Number((site1.latitude + 0.00015).toFixed(6)),
                longitude: Number((site1.longitude + 0.00012).toFixed(6)),
                accuracy: 6,
                altitude: 35,
                speed: 0,
                timestamp: new Date()
            };
        } else if (preset === 'onsite-site2') {
            // Inside site 2 (approx 35m from center)
            this.mockPosition = {
                latitude: Number((site2.latitude + 0.0002).toFixed(6)),
                longitude: Number((site2.longitude - 0.00018).toFixed(6)),
                accuracy: 8,
                altitude: 12,
                speed: 0,
                timestamp: new Date()
            };
        } else if (preset === 'offsite') {
            // Far off-site (approx 3.8 km away)
            this.mockPosition = {
                latitude: 37.8105,
                longitude: -122.4350,
                accuracy: 14,
                altitude: 45,
                speed: 0,
                timestamp: new Date()
            };
        }

        this.notifyListeners();
    }
}

window.geoEngine = new GeoEngine();
