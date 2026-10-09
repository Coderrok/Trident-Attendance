/**
 * SitePulse - Main Application Controller
 * Manages separate User Panel (Field Staff Mobile Punch) and Admin Panel (Foreman Portal),
 * GPS tracking, geofence verification, MySQL sync, PDF exports, and staff management.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- APP STATE ---
    const state = {
        currentPortal: 'worker', // 'worker' or 'admin'
        isAdminLoggedIn: sessionStorage.getItem('sitepulse_admin_logged_in') === 'true',
        adminPin: '1234',
        activeAdminTab: 'tab-dashboard',
        currentStaffId: 'EMP-101',
        activeShiftRecord: null,
        clockInterval: null,
        shiftTimerInterval: null,
        map: null,
        workerMarker: null,
        siteCircles: [],
        currentFilter: {
            dateRange: '30days',
            startDate: null,
            endDate: null,
            siteId: 'all',
            staffId: 'all',
            status: 'all',
            page: 1,
            pageSize: 15
        },
        audioCtx: null
    };

    // --- DOM REFERENCES ---
    const dom = {
        // Portal Switchers
        btnSwitchWorkerPortal: document.getElementById('btnSwitchWorkerPortal'),
        btnSwitchAdminPortal: document.getElementById('btnSwitchAdminPortal'),
        panelWorker: document.getElementById('panelWorker'),
        panelAdmin: document.getElementById('panelAdmin'),
        adminNavTabs: document.getElementById('adminNavTabs'),

        // Admin Auth
        adminLockScreen: document.getElementById('adminLockScreen'),
        adminWorkspace: document.getElementById('adminWorkspace'),
        formAdminPin: document.getElementById('formAdminPin'),
        adminPinInput: document.getElementById('adminPinInput'),
        btnQuickDemoUnlock: document.getElementById('btnQuickDemoUnlock'),
        btnAdminLogout: document.getElementById('btnAdminLogout'),

        // Header
        headerGpsPill: document.getElementById('headerGpsPill'),
        headerGpsDot: document.getElementById('headerGpsDot'),
        headerGpsText: document.getElementById('headerGpsText'),
        btnToggleSunlight: document.getElementById('btnToggleSunlight'),
        tabButtons: document.querySelectorAll('#adminNavTabs .tab-btn'),
        tabContents: document.querySelectorAll('#panelAdmin .tab-content'),

        // Simulator
        simButtons: document.querySelectorAll('.btn-sim'),

        // Punch Station (User Panel)
        selectWorker: document.getElementById('selectWorker'),
        workerAvatarBadge: document.getElementById('workerAvatarBadge'),
        workerNameDisplay: document.getElementById('workerNameDisplay'),
        workerRoleDisplay: document.getElementById('workerRoleDisplay'),
        shiftStatusTag: document.getElementById('shiftStatusTag'),
        liveDateBanner: document.getElementById('liveDateBanner'),
        liveClockDigits: document.getElementById('liveClockDigits'),
        nearestSiteName: document.getElementById('nearestSiteName'),
        nearestSiteDistance: document.getElementById('nearestSiteDistance'),
        siteRadiusDisplay: document.getElementById('siteRadiusDisplay'),
        geofenceBadge: document.getElementById('geofenceBadge'),
        liveLat: document.getElementById('liveLat'),
        liveLng: document.getElementById('liveLng'),
        liveAccuracy: document.getElementById('liveAccuracy'),
        liveSatStatus: document.getElementById('liveSatStatus'),
        btnPunchIn: document.getElementById('btnPunchIn'),
        btnPunchOut: document.getElementById('btnPunchOut'),
        activeShiftBanner: document.getElementById('activeShiftBanner'),
        activeShiftTimer: document.getElementById('activeShiftTimer'),
        punchNoteInput: document.getElementById('punchNoteInput'),
        workerLogCount: document.getElementById('workerLogCount'),
        workerRecentLogsList: document.getElementById('workerRecentLogsList'),

        // Map & Camera
        btnCenterMap: document.getElementById('btnCenterMap'),
        btnToggleCamera: document.getElementById('btnToggleCamera'),
        cameraToggleLabel: document.getElementById('cameraToggleLabel'),
        cameraPreviewBox: document.getElementById('cameraPreviewBox'),
        btnSnapPhoto: document.getElementById('btnSnapPhoto'),
        photoThumbnailBox: document.getElementById('photoThumbnailBox'),
        photoThumbImg: document.getElementById('photoThumbImg'),
        btnClearPhoto: document.getElementById('btnClearPhoto'),

        // Manager Dashboard (Admin Panel)
        kpiActiveShifts: document.getElementById('kpiActiveShifts'),
        kpiTotalHours: document.getElementById('kpiTotalHours'),
        kpiCompliance: document.getElementById('kpiCompliance'),
        kpiLateCount: document.getElementById('kpiLateCount'),
        liveRosterBody: document.getElementById('liveRosterBody'),

        // Logs & Filters (Admin Panel)
        filterDateRange: document.getElementById('filterDateRange'),
        groupStartDate: document.getElementById('groupStartDate'),
        groupEndDate: document.getElementById('groupEndDate'),
        filterStartDate: document.getElementById('filterStartDate'),
        filterEndDate: document.getElementById('filterEndDate'),
        filterSite: document.getElementById('filterSite'),
        filterStaff: document.getElementById('filterStaff'),
        filterStatus: document.getElementById('filterStatus'),
        logsTableBody: document.getElementById('logsTableBody'),
        pageIndicatorText: document.getElementById('pageIndicatorText'),
        btnPrevPage: document.getElementById('btnPrevPage'),
        btnNextPage: document.getElementById('btnNextPage'),
        pageNumberPills: document.getElementById('pageNumberPills'),
        btnExportPDF: document.getElementById('btnExportPDF'),
        btnExportCSV: document.getElementById('btnExportCSV'),
        btnResetDemoData: document.getElementById('btnResetDemoData'),

        // Sites Management (Admin Panel)
        sitesGridContainer: document.getElementById('sitesGridContainer'),
        btnOpenAddSiteModal: document.getElementById('btnOpenAddSiteModal'),
        addSiteModal: document.getElementById('addSiteModal'),
        btnCloseSiteModal: document.getElementById('btnCloseSiteModal'),
        btnCancelAddSite: document.getElementById('btnCancelAddSite'),
        formAddSite: document.getElementById('formAddSite'),
        btnGrabCurrentCoords: document.getElementById('btnGrabCurrentCoords'),
        newSiteLat: document.getElementById('newSiteLat'),
        newSiteLng: document.getElementById('newSiteLng'),

        // Staff Management (Admin Panel)
        staffCardsContainer: document.getElementById('staffCardsContainer'),
        btnOpenAddStaffModal: document.getElementById('btnOpenAddStaffModal'),
        addStaffModal: document.getElementById('addStaffModal'),
        btnCloseStaffModal: document.getElementById('btnCloseStaffModal'),
        btnCancelAddStaff: document.getElementById('btnCancelAddStaff'),
        formAddStaff: document.getElementById('formAddStaff'),
        newStaffSite: document.getElementById('newStaffSite'),

        // Mandatory GPS Modal
        mandatoryGpsOverlay: document.getElementById('mandatoryGpsOverlay'),
        btnForceRetryGps: document.getElementById('btnForceRetryGps'),
        toastStack: document.getElementById('toastStack')
    };

    // --- AUDIO FEEDBACK ---
    function playAudioChime(type = 'success') {
        try {
            if (!state.audioCtx) {
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                state.audioCtx = new AudioCtx();
            }
            if (state.audioCtx.state === 'suspended') {
                state.audioCtx.resume();
            }

            const ctx = state.audioCtx;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'success') {
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(523.25, now);
                osc.frequency.setValueAtTime(783.99, now + 0.12);
                gain.gain.setValueAtTime(0.15, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
                osc.start(now);
                osc.stop(now + 0.35);
            } else if (type === 'error') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(160, now);
                osc.frequency.setValueAtTime(130, now + 0.15);
                gain.gain.setValueAtTime(0.2, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
                osc.start(now);
                osc.stop(now + 0.3);
            }
        } catch (e) {
            // Audio policy fallback
        }
    }

    // --- TOAST NOTIFICATIONS ---
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        const iconMap = {
            success: 'fa-circle-check',
            error: 'fa-circle-exclamation',
            warning: 'fa-triangle-exclamation'
        };

        toast.innerHTML = `
            <i class="fa-solid ${iconMap[type] || 'fa-bell'}"></i>
            <span>${message}</span>
        `;

        dom.toastStack.appendChild(toast);
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 4000);
    }

    // --- PORTAL SWITCHING (USER PANEL VS ADMIN PANEL) ---
    function switchPortal(portal) {
        state.currentPortal = portal;

        if (portal === 'worker') {
            dom.btnSwitchWorkerPortal.classList.add('active');
            dom.btnSwitchAdminPortal.classList.remove('active');
            dom.panelWorker.classList.add('active');
            dom.panelAdmin.classList.remove('active');
            dom.adminNavTabs.style.display = 'none';

            if (state.map) {
                setTimeout(() => state.map.invalidateSize(), 150);
            }
            renderWorkerRecentPunches();
        } else if (portal === 'admin') {
            dom.btnSwitchAdminPortal.classList.add('active');
            dom.btnSwitchWorkerPortal.classList.remove('active');
            dom.panelAdmin.classList.add('active');
            dom.panelWorker.classList.remove('active');

            if (state.isAdminLoggedIn) {
                dom.adminLockScreen.style.display = 'none';
                dom.adminWorkspace.style.display = 'block';
                dom.adminNavTabs.style.display = 'flex';
                refreshDashboard();
                refreshLogsTable();
                renderSitesList();
                renderStaffList();
            } else {
                dom.adminLockScreen.style.display = 'block';
                dom.adminWorkspace.style.display = 'none';
                dom.adminNavTabs.style.display = 'none';
                setTimeout(() => dom.adminPinInput.focus(), 100);
            }
        }
    }

    dom.btnSwitchWorkerPortal.addEventListener('click', () => switchPortal('worker'));
    dom.btnSwitchAdminPortal.addEventListener('click', () => switchPortal('admin'));

    // --- ADMIN AUTHENTICATION ---
    dom.formAdminPin.addEventListener('submit', (e) => {
        e.preventDefault();
        const enteredPin = dom.adminPinInput.value.trim();
        if (enteredPin === state.adminPin) {
            state.isAdminLoggedIn = true;
            sessionStorage.setItem('sitepulse_admin_logged_in', 'true');
            dom.adminPinInput.value = '';
            showToast('Foreman / Admin Authentication Successful!', 'success');
            switchPortal('admin');
        } else {
            playAudioChime('error');
            showToast('Incorrect Admin PIN. Default PIN is 1234', 'error');
            dom.adminPinInput.select();
        }
    });

    dom.btnQuickDemoUnlock.addEventListener('click', () => {
        dom.adminPinInput.value = '1234';
        dom.formAdminPin.dispatchEvent(new Event('submit'));
    });

    dom.btnAdminLogout.addEventListener('click', () => {
        state.isAdminLoggedIn = false;
        sessionStorage.removeItem('sitepulse_admin_logged_in');
        showToast('Admin logged out. Returning to Field Staff Terminal.', 'warning');
        switchPortal('worker');
    });

    // --- ADMIN SUB-TABS ---
    dom.tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            dom.tabButtons.forEach(b => b.classList.remove('active'));
            dom.tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const targetId = btn.getAttribute('data-tab');
            const targetSection = document.getElementById(targetId);
            if (targetSection) {
                targetSection.classList.add('active');
                state.activeAdminTab = targetId;

                if (targetId === 'tab-dashboard') {
                    refreshDashboard();
                } else if (targetId === 'tab-logs') {
                    refreshLogsTable();
                } else if (targetId === 'tab-sites') {
                    renderSitesList();
                } else if (targetId === 'tab-staff') {
                    renderStaffList();
                }
            }
        });
    });

    // --- LIVE HIGH-PRECISION TICKER ---
    function initClock() {
        function tick() {
            const now = new Date();
            const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
            const months = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

            dom.liveDateBanner.textContent = `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;

            const pad = (n) => String(n).padStart(2, '0');
            dom.liveClockDigits.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        }
        tick();
        state.clockInterval = setInterval(tick, 1000);
    }

    // --- ACTIVE SHIFT ELAPSED TIMER ---
    function updateActiveShiftTimer() {
        if (!state.activeShiftRecord) return;
        const start = new Date(state.activeShiftRecord.checkIn.timestamp);
        const now = new Date();
        const diffSeconds = Math.max(0, Math.floor((now - start) / 1000));

        const hours = Math.floor(diffSeconds / 3600);
        const mins = Math.floor((diffSeconds % 3600) / 60);
        const secs = diffSeconds % 60;
        const pad = (n) => String(n).padStart(2, '0');

        dom.activeShiftTimer.textContent = `${pad(hours)}h ${pad(mins)}m ${pad(secs)}s`;
    }

    // --- LEAFLET INTERACTIVE MAP ---
    function initMap() {
        if (state.map) return;

        const defaultLat = 37.78985;
        const defaultLng = -122.39955;

        state.map = L.map('fieldMap', {
            zoomControl: true,
            attributionControl: false
        }).setView([defaultLat, defaultLng], 14);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19
        }).addTo(state.map);

        renderMapSites();
    }

    async function renderMapSites() {
        if (!state.map) return;

        state.siteCircles.forEach(c => state.map.removeLayer(c));
        state.siteCircles = [];

        const sites = await window.storageEngine.getSitesAsync();
        sites.forEach(site => {
            const circle = L.circle([site.latitude, site.longitude], {
                color: '#F59E0B',
                fillColor: '#F59E0B',
                fillOpacity: 0.18,
                weight: 2,
                radius: site.radius || 150
            }).addTo(state.map);

            circle.bindPopup(`
                <strong style="color: #0F172A;">${site.name}</strong><br/>
                <span style="font-size: 11px; color: #475569;">Code: ${site.code}</span><br/>
                <span style="font-size: 11px; color: #475569;">Radius: ${site.radius}m | Supervisor: ${site.supervisor}</span>
            `);

            state.siteCircles.push(circle);
        });
    }

    function updateMapWorkerPosition(coords) {
        if (!state.map || !coords) return;

        const { latitude, longitude, accuracy } = coords;

        if (state.workerMarker) {
            state.workerMarker.setLatLng([latitude, longitude]);
        } else {
            const customIcon = L.divIcon({
                className: 'custom-worker-pin',
                html: `<div style="background: #38BDF8; width: 14px; height: 14px; border-radius: 50%; border: 3px solid #FFFFFF; box-shadow: 0 0 12px #38BDF8;"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            state.workerMarker = L.marker([latitude, longitude], { icon: customIcon }).addTo(state.map);
            state.workerMarker.bindPopup(`<strong>Your GPS Location</strong><br/>Accuracy: ±${accuracy}m`);
        }
    }

    // --- GEOLOCATION LISTENER ---
    function handleGeoStateChange(geoState) {
        const { hasGPS, permissionStatus, position, error } = geoState;

        if (permissionStatus === 'denied' || permissionStatus === 'unavailable') {
            dom.headerGpsDot.className = 'gps-dot';
            dom.headerGpsText.textContent = 'GPS BLOCKED';
            dom.mandatoryGpsOverlay.classList.add('show');
            dom.btnPunchIn.disabled = true;
            dom.btnPunchOut.disabled = true;
            dom.liveSatStatus.textContent = 'NO SATELLITE FIX';
            dom.liveSatStatus.style.color = 'var(--hazard-red)';
            return;
        } else {
            dom.mandatoryGpsOverlay.classList.remove('show');
        }

        if (position) {
            dom.headerGpsDot.className = 'gps-dot active';
            dom.headerGpsText.textContent = `GPS LOCKED (±${position.accuracy}m)`;

            dom.liveLat.textContent = position.latitude.toFixed(6);
            dom.liveLng.textContent = position.longitude.toFixed(6);
            dom.liveAccuracy.textContent = `± ${position.accuracy} meters`;
            dom.liveSatStatus.textContent = 'ACTIVE 3D FIX';
            dom.liveSatStatus.style.color = 'var(--safety-green)';

            const sites = window.storageEngine.getSites();
            const evalResult = window.geoEngine.evaluateSites(sites);

            if (evalResult.nearestSite) {
                const nearest = evalResult.nearestSite;
                dom.nearestSiteName.textContent = nearest.name;
                dom.siteRadiusDisplay.textContent = `${nearest.radius}m`;

                if (nearest.distanceMeters > 1000) {
                    dom.nearestSiteDistance.textContent = `${(nearest.distanceMeters / 1000).toFixed(2)} km`;
                } else {
                    dom.nearestSiteDistance.textContent = `${nearest.distanceMeters} meters`;
                }

                if (evalResult.isWithinGeofence) {
                    dom.geofenceBadge.className = 'status-badge safe';
                    dom.geofenceBadge.innerHTML = `<i class="fa-solid fa-shield-halved"></i> <span>WITHIN GEOFENCE</span>`;
                } else {
                    dom.geofenceBadge.className = 'status-badge danger';
                    dom.geofenceBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> <span>OUT OF BOUNDS</span>`;
                }
            }

            updateMapWorkerPosition(position);
            syncStaffPunchState();
        } else {
            dom.headerGpsDot.className = 'gps-dot warning';
            dom.headerGpsText.textContent = 'SEARCHING SATELLITES...';
            dom.liveSatStatus.textContent = 'ACQUIRING FIX...';
            dom.liveSatStatus.style.color = 'var(--safety-amber)';
        }
    }

    // --- STAFF SELECTION & SHIFT STATE ---
    async function initStaffSelector() {
        const staff = await window.storageEngine.getStaffAsync();
        dom.selectWorker.innerHTML = '';

        staff.forEach(worker => {
            const opt = document.createElement('option');
            opt.value = worker.id;
            opt.textContent = `${worker.name} (${worker.id}) - ${worker.role}`;
            dom.selectWorker.appendChild(opt);
        });

        dom.selectWorker.value = state.currentStaffId;
        dom.selectWorker.addEventListener('change', (e) => {
            state.currentStaffId = e.target.value;
            syncStaffProfile();
            renderWorkerRecentPunches();
        });

        syncStaffProfile();
        renderWorkerRecentPunches();
    }

    function syncStaffProfile() {
        const staff = window.storageEngine.getStaff();
        const worker = staff.find(s => s.id === state.currentStaffId) || staff[0];

        if (worker) {
            dom.workerAvatarBadge.textContent = worker.avatar || worker.name.substring(0, 2).toUpperCase();
            dom.workerNameDisplay.textContent = worker.name;
            dom.workerRoleDisplay.textContent = `${worker.role} • ${worker.id}`;
        }

        syncStaffPunchState();
    }

    function syncStaffPunchState() {
        const activePunch = window.storageEngine.getActivePunchForStaff(state.currentStaffId);
        state.activeShiftRecord = activePunch;

        if (activePunch) {
            dom.btnPunchIn.disabled = true;
            dom.btnPunchOut.disabled = false;
            dom.shiftStatusTag.className = 'badge-tag overtime';
            dom.shiftStatusTag.textContent = 'SHIFT IN PROGRESS';

            dom.activeShiftBanner.style.display = 'flex';
            if (state.shiftTimerInterval) clearInterval(state.shiftTimerInterval);
            updateActiveShiftTimer();
            state.shiftTimerInterval = setInterval(updateActiveShiftTimer, 1000);
        } else {
            const geoState = window.geoEngine.getState();
            const gpsOk = geoState.hasGPS && geoState.permissionStatus !== 'denied';

            dom.btnPunchIn.disabled = !gpsOk;
            dom.btnPunchOut.disabled = true;
            dom.shiftStatusTag.className = 'badge-tag verified';
            dom.shiftStatusTag.textContent = 'READY FOR SHIFT';

            dom.activeShiftBanner.style.display = 'none';
            if (state.shiftTimerInterval) {
                clearInterval(state.shiftTimerInterval);
                state.shiftTimerInterval = null;
            }
        }
    }

    // Render individual worker's recent punches in User Panel
    async function renderWorkerRecentPunches() {
        dom.workerRecentLogsList.innerHTML = '<span style="color: var(--text-dim);">Loading shift logs...</span>';
        const res = await window.storageEngine.queryAttendanceAsync({
            staffId: state.currentStaffId,
            pageSize: 5
        });

        const list = res.records || [];
        dom.workerLogCount.textContent = `${list.length} recent punches`;
        dom.workerRecentLogsList.innerHTML = '';

        if (list.length === 0) {
            dom.workerRecentLogsList.innerHTML = '<span style="color: var(--text-dim);">No punch records found for this worker.</span>';
            return;
        }

        list.forEach(r => {
            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '0.35rem 0.5rem';
            row.style.background = 'rgba(0,0,0,0.2)';
            row.style.borderRadius = '4px';

            const isActive = r.checkOut === null;
            row.innerHTML = `
                <div>
                    <strong>${r.date}</strong> &bull; <span style="color: var(--safety-amber);">${r.siteName}</span>
                    <div style="color: var(--text-dim); font-size: 0.7rem;">In: ${r.checkIn.timeFormatted} | Out: ${r.checkOut ? r.checkOut.timeFormatted : 'In Progress'}</div>
                </div>
                <span class="badge-tag ${isActive ? 'overtime' : 'present'}" style="font-size: 0.65rem;">
                    ${isActive ? 'Active' : r.totalDurationFormatted}
                </span>
            `;
            dom.workerRecentLogsList.appendChild(row);
        });
    }

    // --- PUNCH ACTIONS ---
    dom.btnPunchIn.addEventListener('click', async () => {
        const geoState = window.geoEngine.getState();
        if (!geoState.hasGPS || !geoState.position) {
            playAudioChime('error');
            showToast('GPS location required. Please wait for satellite lock.', 'error');
            return;
        }

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const timeFormatted = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        const dateStr = now.toISOString().split('T')[0];

        const staff = window.storageEngine.getStaff();
        const worker = staff.find(s => s.id === state.currentStaffId);
        const sites = window.storageEngine.getSites();
        const evalResult = window.geoEngine.evaluateSites(sites);
        const assignedSite = evalResult.nearestSite || sites[0];

        let status = 'Present';
        if (now.getHours() > 8 || (now.getHours() === 8 && now.getMinutes() > 15)) {
            status = 'Late';
        }

        const geofenceVerified = evalResult.isWithinGeofence;
        const photo = window.cameraModule.getSnapshot();

        const record = {
            id: `ATT-${Date.now().toString(36).toUpperCase()}`,
            staffId: worker.id,
            staffName: worker.name,
            role: worker.role,
            siteId: assignedSite.id,
            siteName: assignedSite.name,
            siteCode: assignedSite.code,
            date: dateStr,
            checkIn: {
                timestamp: now.toISOString(),
                timeFormatted: timeFormatted,
                latitude: geoState.position.latitude,
                longitude: geoState.position.longitude,
                accuracy: geoState.position.accuracy,
                geofenceDistanceMeters: evalResult.distanceMeters,
                geofenceVerified: geofenceVerified,
                device: 'MySQL Field GPS'
            },
            checkOut: null,
            totalDurationSeconds: null,
            totalDurationFormatted: 'In Progress',
            totalHoursDecimal: 0,
            status: status,
            geofenceFlag: geofenceVerified ? 'Verified (On-Site)' : `Flagged (${evalResult.distanceMeters}m Off-Site)`,
            verifiedPhoto: photo,
            notes: dom.punchNoteInput.value.trim() || (geofenceVerified ? 'Normal on-site punch.' : 'Punched outside site perimeter boundary.')
        };

        await window.storageEngine.addAttendanceRecordAsync(record);
        state.activeShiftRecord = record;

        playAudioChime('success');
        showToast(`CHECK-IN RECORDED at ${timeFormatted} [${assignedSite.name}]`, 'success');

        dom.punchNoteInput.value = '';
        syncStaffPunchState();
        renderWorkerRecentPunches();
    });

    dom.btnPunchOut.addEventListener('click', async () => {
        if (!state.activeShiftRecord) return;

        const geoState = window.geoEngine.getState();
        if (!geoState.hasGPS || !geoState.position) {
            playAudioChime('error');
            showToast('GPS location required for checkout.', 'error');
            return;
        }

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const timeFormatted = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

        const checkInDate = new Date(state.activeShiftRecord.checkIn.timestamp);
        const durationSeconds = Math.max(0, Math.floor((now - checkInDate) / 1000));
        const hours = Math.floor(durationSeconds / 3600);
        const mins = Math.floor((durationSeconds % 3600) / 60);
        const durationFormatted = `${hours}h ${mins}m`;
        const decimalHours = Number((durationSeconds / 3600).toFixed(2));

        let finalStatus = state.activeShiftRecord.status;
        if (hours >= 9) {
            finalStatus = finalStatus.includes('Late') ? 'Late / Overtime' : 'Overtime';
        } else if (hours < 4) {
            finalStatus = 'Half-Day';
        }

        const sites = window.storageEngine.getSites();
        const evalResult = window.geoEngine.evaluateSites(sites);

        const updates = {
            checkOut: {
                timestamp: now.toISOString(),
                timeFormatted: timeFormatted,
                latitude: geoState.position.latitude,
                longitude: geoState.position.longitude,
                accuracy: geoState.position.accuracy,
                geofenceDistanceMeters: evalResult.distanceMeters,
                geofenceVerified: evalResult.isWithinGeofence
            },
            totalDurationSeconds: durationSeconds,
            totalDurationFormatted: durationFormatted,
            totalHoursDecimal: decimalHours,
            status: finalStatus
        };

        await window.storageEngine.updateAttendanceRecordAsync(state.activeShiftRecord.id, updates);
        state.activeShiftRecord = null;

        playAudioChime('success');
        showToast(`CHECK-OUT COMPLETE at ${timeFormatted}. Shift: ${durationFormatted}`, 'success');

        syncStaffPunchState();
        renderWorkerRecentPunches();
    });

    // --- CAMERA / PHOTO MODULE ---
    dom.btnToggleCamera.addEventListener('click', async () => {
        if (dom.cameraPreviewBox.style.display === 'none') {
            const started = await window.cameraModule.startCamera('cameraVideo');
            if (started) {
                dom.cameraPreviewBox.style.display = 'block';
                dom.cameraToggleLabel.textContent = 'Close Camera';
            } else {
                showToast('Camera access unavailable on this device.', 'warning');
            }
        } else {
            window.cameraModule.stopCamera();
            dom.cameraPreviewBox.style.display = 'none';
            dom.cameraToggleLabel.textContent = 'Open Camera';
        }
    });

    dom.btnSnapPhoto.addEventListener('click', () => {
        const photo = window.cameraModule.captureSnapshot();
        if (photo) {
            dom.photoThumbImg.src = photo;
            dom.photoThumbnailBox.style.display = 'flex';
            dom.cameraPreviewBox.style.display = 'none';
            window.cameraModule.stopCamera();
            dom.cameraToggleLabel.textContent = 'Retake Photo';
            showToast('Field photo stamped with GPS & timestamp.', 'success');
        }
    });

    dom.btnClearPhoto.addEventListener('click', async () => {
        window.cameraModule.clearSnapshot();
        dom.photoThumbnailBox.style.display = 'none';
        const started = await window.cameraModule.startCamera('cameraVideo');
        if (started) {
            dom.cameraPreviewBox.style.display = 'block';
            dom.cameraToggleLabel.textContent = 'Close Camera';
        }
    });

    // --- SIMULATOR CONTROLS ---
    dom.simButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            dom.simButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const simType = btn.getAttribute('data-sim');
            const sites = window.storageEngine.getSites();
            window.geoEngine.setMockLocation(simType, sites);

            if (simType === 'real') {
                showToast('Switched to real device GPS hardware.', 'success');
            } else if (simType === 'denied') {
                showToast('Simulated GPS permission denial.', 'warning');
            } else {
                showToast(`Teleported GPS: ${btn.textContent}`, 'success');
            }
        });
    });

    // --- MANDATORY GPS RETRY MODAL ---
    dom.btnForceRetryGps.addEventListener('click', async () => {
        try {
            await window.geoEngine.requestGPSPermission();
            dom.mandatoryGpsOverlay.classList.remove('show');
            showToast('GPS permission granted successfully!', 'success');
        } catch (e) {
            showToast('Location still unavailable. Please check device settings.', 'error');
        }
    });

    // --- OUTDOOR SUNLIGHT MODE TOGGLE ---
    dom.btnToggleSunlight.addEventListener('click', () => {
        document.body.classList.toggle('outdoor-sunlight-mode');
        const isSunlight = document.body.classList.contains('outdoor-sunlight-mode');
        dom.btnToggleSunlight.querySelector('span').textContent = isSunlight ? 'Dark Mode' : 'Outdoor Mode';
        showToast(isSunlight ? 'Outdoor Sunlight Mode Activated' : 'Armor Dark Mode Restored', 'success');
    });

    // --- CENTER MAP ---
    dom.btnCenterMap.addEventListener('click', () => {
        const coords = window.geoEngine.getCurrentCoords();
        if (state.map && coords) {
            state.map.setView([coords.latitude, coords.longitude], 16, { animate: true });
        }
    });

    // --- ADMIN: EXECUTIVE DASHBOARD ---
    async function refreshDashboard() {
        const queryRes = await window.storageEngine.queryAttendanceAsync({ dateRange: '30days' });
        const { stats } = queryRes;

        dom.kpiActiveShifts.textContent = stats.activeShifts;
        dom.kpiTotalHours.textContent = stats.totalHours;
        dom.kpiCompliance.textContent = `${stats.complianceRate}%`;
        dom.kpiLateCount.textContent = stats.lateCount;

        const todayQuery = await window.storageEngine.queryAttendanceAsync({ dateRange: 'today', pageSize: 100 });
        const todayRecords = todayQuery.records || [];

        dom.liveRosterBody.innerHTML = '';
        if (todayRecords.length === 0) {
            dom.liveRosterBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-dim); padding: 1.5rem;">No field shifts recorded yet today. Use the Punch Station to log attendance.</td></tr>`;
            return;
        }

        todayRecords.forEach(r => {
            const tr = document.createElement('tr');
            const isActive = r.checkOut === null;
            const statusClass = isActive ? 'overtime' : (r.status.includes('Late') ? 'late' : 'present');
            const durationText = isActive ? 'Active Now' : (r.totalDurationFormatted || '--');

            tr.innerHTML = `
                <td><strong>${r.staffName}</strong><br/><small style="color: var(--text-dim);">${r.staffId}</small></td>
                <td>${r.role}</td>
                <td>${r.siteName}<br/><small style="color: var(--text-dim);">${r.siteCode}</small></td>
                <td><span style="font-family: var(--font-mono);">${r.checkIn.timeFormatted}</span></td>
                <td><strong style="font-family: var(--font-mono);">${durationText}</strong></td>
                <td>
                    <span class="mono-coord">${r.checkIn.latitude.toFixed(4)}, ${r.checkIn.longitude.toFixed(4)}</span>
                    <small style="color: ${r.checkIn.geofenceVerified ? 'var(--safety-green)' : 'var(--hazard-red)'}; font-weight: 700;">
                        ${r.checkIn.geofenceVerified ? 'On-Site' : 'Off-Site Flagged'}
                    </small>
                </td>
                <td>
                    <span class="badge-tag ${statusClass}">${isActive ? 'Punched In' : r.status}</span>
                </td>
            `;
            dom.liveRosterBody.appendChild(tr);
        });
    }

    // --- ADMIN: ATTENDANCE LOGS TABLE & FILTERS ---
    async function initLogsFilters() {
        const sites = await window.storageEngine.getSitesAsync();
        dom.filterSite.innerHTML = '<option value="all">All Construction Sites</option>';
        sites.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${s.name} (${s.code})`;
            dom.filterSite.appendChild(opt);
        });

        const staff = await window.storageEngine.getStaffAsync();
        dom.filterStaff.innerHTML = '<option value="all">All Field Staff</option>';
        staff.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.id;
            opt.textContent = `${m.name} (${m.id})`;
            dom.filterStaff.appendChild(opt);
        });

        dom.filterDateRange.addEventListener('change', (e) => {
            state.currentFilter.dateRange = e.target.value;
            const isCustom = e.target.value === 'custom';
            dom.groupStartDate.style.display = isCustom ? 'flex' : 'none';
            dom.groupEndDate.style.display = isCustom ? 'flex' : 'none';
            state.currentFilter.page = 1;
            refreshLogsTable();
        });

        dom.filterStartDate.addEventListener('change', (e) => {
            state.currentFilter.startDate = e.target.value;
            state.currentFilter.page = 1;
            refreshLogsTable();
        });

        dom.filterEndDate.addEventListener('change', (e) => {
            state.currentFilter.endDate = e.target.value;
            state.currentFilter.page = 1;
            refreshLogsTable();
        });

        dom.filterSite.addEventListener('change', (e) => {
            state.currentFilter.siteId = e.target.value;
            state.currentFilter.page = 1;
            refreshLogsTable();
        });

        dom.filterStaff.addEventListener('change', (e) => {
            state.currentFilter.staffId = e.target.value;
            state.currentFilter.page = 1;
            refreshLogsTable();
        });

        dom.filterStatus.addEventListener('change', (e) => {
            state.currentFilter.status = e.target.value;
            state.currentFilter.page = 1;
            refreshLogsTable();
        });

        dom.btnPrevPage.addEventListener('click', () => {
            if (state.currentFilter.page > 1) {
                state.currentFilter.page--;
                refreshLogsTable();
            }
        });

        dom.btnNextPage.addEventListener('click', () => {
            state.currentFilter.page++;
            refreshLogsTable();
        });
    }

    async function refreshLogsTable() {
        const queryRes = await window.storageEngine.queryAttendanceAsync(state.currentFilter);
        const { records, totalRecords, totalPages, currentPage, pageSize } = queryRes;

        dom.logsTableBody.innerHTML = '';

        if (records.length === 0) {
            dom.logsTableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: var(--text-dim); padding: 2rem;">No attendance records found matching current criteria.</td></tr>`;
            dom.pageIndicatorText.textContent = 'Showing 0 records';
            dom.btnPrevPage.disabled = true;
            dom.btnNextPage.disabled = true;
            dom.pageNumberPills.innerHTML = '';
            return;
        }

        const startIdx = (currentPage - 1) * pageSize + 1;
        const endIdx = Math.min(currentPage * pageSize, totalRecords);
        dom.pageIndicatorText.textContent = `Showing ${startIdx} - ${endIdx} of ${totalRecords} records (Page ${currentPage} of ${totalPages})`;

        dom.btnPrevPage.disabled = currentPage <= 1;
        dom.btnNextPage.disabled = currentPage >= totalPages;

        dom.pageNumberPills.innerHTML = '';
        const maxPills = Math.min(totalPages, 5);
        for (let i = 1; i <= maxPills; i++) {
            const pBtn = document.createElement('button');
            pBtn.className = `page-btn ${i === currentPage ? 'active' : ''}`;
            pBtn.textContent = i;
            pBtn.addEventListener('click', () => {
                state.currentFilter.page = i;
                refreshLogsTable();
            });
            dom.pageNumberPills.appendChild(pBtn);
        }

        records.forEach(r => {
            const tr = document.createElement('tr');

            const inGps = r.checkIn
                ? `<span style="font-family: var(--font-mono); font-weight: 700;">${r.checkIn.timeFormatted}</span><br/>
                   <span class="mono-coord">${r.checkIn.latitude.toFixed(4)}, ${r.checkIn.longitude.toFixed(4)} (±${r.checkIn.accuracy || 5}m)</span>`
                : '--';

            const outGps = r.checkOut
                ? `<span style="font-family: var(--font-mono); font-weight: 700;">${r.checkOut.timeFormatted}</span><br/>
                   <span class="mono-coord">${r.checkOut.latitude.toFixed(4)}, ${r.checkOut.longitude.toFixed(4)}</span>`
                : '<span style="color: var(--safety-amber); font-weight: 700;">In Progress</span>';

            const isGeofenceOk = r.checkIn && r.checkIn.geofenceVerified;
            const geofenceTag = isGeofenceOk
                ? `<span class="badge-tag verified"><i class="fa-solid fa-check"></i> On-Site (${r.checkIn.geofenceDistanceMeters || 12}m)</span>`
                : `<span class="badge-tag flagged"><i class="fa-solid fa-triangle-exclamation"></i> Off-Site (${r.checkIn ? r.checkIn.geofenceDistanceMeters : 0}m)</span>`;

            let statusClass = 'present';
            if (r.status.includes('Late')) statusClass = 'late';
            if (r.status.includes('Overtime')) statusClass = 'overtime';

            tr.innerHTML = `
                <td><strong>${r.date}</strong></td>
                <td><strong>${r.staffName}</strong><br/><small style="color: var(--text-dim);">${r.staffId} • ${r.role}</small></td>
                <td>${r.siteName}<br/><small style="color: var(--text-dim);">${r.siteCode}</small></td>
                <td>${inGps}</td>
                <td>${outGps}</td>
                <td><strong style="font-family: var(--font-mono);">${r.totalDurationFormatted || 'In Progress'}</strong></td>
                <td>${geofenceTag}</td>
                <td><span class="badge-tag ${statusClass}">${r.status}</span></td>
            `;
            dom.logsTableBody.appendChild(tr);
        });
    }

    // --- ADMIN: EXPORT TO PDF & CSV ---
    dom.btnExportPDF.addEventListener('click', async () => {
        showToast('Generating official PDF audit report...', 'warning');

        const queryRes = await window.storageEngine.queryAttendanceAsync({
            ...state.currentFilter,
            page: 1,
            pageSize: 1000
        });

        const filterLabels = {
            dateRangeLabel: dom.filterDateRange.options[dom.filterDateRange.selectedIndex].text,
            siteLabel: dom.filterSite.options[dom.filterSite.selectedIndex].text,
            staffLabel: dom.filterStaff.options[dom.filterStaff.selectedIndex].text,
            statusLabel: dom.filterStatus.options[dom.filterStatus.selectedIndex].text
        };

        setTimeout(() => {
            try {
                const filename = window.pdfExporter.generateReport({
                    records: queryRes.records,
                    filterInfo: filterLabels,
                    stats: queryRes.stats
                });
                showToast(`PDF Export Ready! Downloaded: ${filename}`, 'success');
            } catch (err) {
                console.error(err);
                showToast('Failed to generate PDF.', 'error');
            }
        }, 150);
    });

    dom.btnExportCSV.addEventListener('click', async () => {
        const queryRes = await window.storageEngine.queryAttendanceAsync({
            ...state.currentFilter,
            page: 1,
            pageSize: 1000
        });
        window.pdfExporter.exportToCSV(queryRes.records);
        showToast('Attendance CSV exported successfully.', 'success');
    });

    dom.btnResetDemoData.addEventListener('click', async () => {
        if (confirm('Re-seed MySQL database (construction_attendance_db) with 35-day realistic demo dataset?')) {
            showToast('Re-seeding MySQL database...', 'warning');
            await window.storageEngine.resetToDemoDataAsync();
            showToast('Re-seed completed! 35-day history populated in MySQL.', 'success');
            await refreshDashboard();
            await refreshLogsTable();
            await renderSitesList();
            await renderStaffList();
        }
    });

    // --- ADMIN: SITES MANAGEMENT ---
    async function renderSitesList() {
        const sites = await window.storageEngine.getSitesAsync();
        dom.sitesGridContainer.innerHTML = '';

        sites.forEach(site => {
            const card = document.createElement('div');
            card.className = 'site-card';
            card.innerHTML = `
                <div>
                    <div class="site-card-top">
                        <div class="site-name-heading">${site.name}</div>
                        <span class="site-code-pill">${site.code}</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-dim); margin-bottom: 0.5rem;">${site.address || 'Address unlisted'}</div>
                    <div class="site-meta-list">
                        <div class="site-meta-item">
                            <i class="fa-solid fa-circle-notch text-amber"></i>
                            <span>Geofence Radius: <strong>${site.radius || 150} meters</strong></span>
                        </div>
                        <div class="site-meta-item">
                            <i class="fa-solid fa-user-shield text-amber"></i>
                            <span>Supervisor: <strong>${site.supervisor || 'Unassigned'}</strong></span>
                        </div>
                        <div class="site-meta-item">
                            <i class="fa-solid fa-location-pin text-amber"></i>
                            <span class="mono-coord">${site.latitude.toFixed(5)}, ${site.longitude.toFixed(5)}</span>
                        </div>
                        <div class="site-meta-item">
                            <i class="fa-solid fa-hard-hat text-amber"></i>
                            <span>Active Crew: <strong>${site.activeWorkers || 12} workers</strong></span>
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
                    <button class="btn-secondary-action btn-view-on-map" data-lat="${site.latitude}" data-lng="${site.longitude}" style="flex: 1; justify-content: center; font-size: 0.75rem;">
                        <i class="fa-solid fa-map"></i> View on Map
                    </button>
                    <button class="btn-secondary-action btn-delete-site" data-site-id="${site.id}" style="color: var(--hazard-red); border-color: rgba(239,68,68,0.3); font-size: 0.75rem;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            dom.sitesGridContainer.appendChild(card);
        });

        dom.sitesGridContainer.querySelectorAll('.btn-view-on-map').forEach(btn => {
            btn.addEventListener('click', () => {
                const lat = parseFloat(btn.getAttribute('data-lat'));
                const lng = parseFloat(btn.getAttribute('data-lng'));
                switchPortal('worker');
                if (state.map) {
                    state.map.setView([lat, lng], 16, { animate: true });
                }
            });
        });

        dom.sitesGridContainer.querySelectorAll('.btn-delete-site').forEach(btn => {
            btn.addEventListener('click', async () => {
                const siteId = btn.getAttribute('data-site-id');
                if (confirm('Delete this construction site from MySQL?')) {
                    await window.storageEngine.deleteSiteAsync(siteId);
                    showToast('Construction site removed from database.', 'warning');
                    await renderSitesList();
                    await renderMapSites();
                    await initLogsFilters();
                }
            });
        });
    }

    dom.btnOpenAddSiteModal.addEventListener('click', () => {
        dom.addSiteModal.classList.add('open');
    });

    dom.btnCloseSiteModal.addEventListener('click', () => {
        dom.addSiteModal.classList.remove('open');
    });

    dom.btnCancelAddSite.addEventListener('click', () => {
        dom.addSiteModal.classList.remove('open');
    });

    dom.btnGrabCurrentCoords.addEventListener('click', () => {
        const coords = window.geoEngine.getCurrentCoords();
        if (coords) {
            dom.newSiteLat.value = coords.latitude.toFixed(6);
            dom.newSiteLng.value = coords.longitude.toFixed(6);
            showToast('Current GPS coordinates captured.', 'success');
        } else {
            showToast('Unable to acquire current GPS.', 'error');
        }
    });

    dom.formAddSite.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newSite = {
            name: document.getElementById('newSiteName').value.trim(),
            code: document.getElementById('newSiteCode').value.trim().toUpperCase(),
            address: document.getElementById('newSiteAddress').value.trim(),
            supervisor: document.getElementById('newSiteSupervisor').value.trim() || 'Site Supervisor',
            latitude: parseFloat(dom.newSiteLat.value),
            longitude: parseFloat(dom.newSiteLng.value),
            radius: parseInt(document.getElementById('newSiteRadius').value, 10) || 150,
            activeWorkers: 0,
            status: 'Active'
        };

        await window.storageEngine.addSiteAsync(newSite);
        dom.formAddSite.reset();
        dom.addSiteModal.classList.remove('open');
        showToast(`New Site Saved in MySQL: ${newSite.name}`, 'success');

        await renderSitesList();
        await renderMapSites();
        await initLogsFilters();
    });

    // --- ADMIN: STAFF MANAGEMENT ---
    async function renderStaffList() {
        const staff = await window.storageEngine.getStaffAsync();
        dom.staffCardsContainer.innerHTML = '';

        staff.forEach(worker => {
            const card = document.createElement('div');
            card.className = 'staff-admin-card';
            card.innerHTML = `
                <div>
                    <div class="staff-admin-card-top">
                        <div class="worker-avatar-badge">${worker.avatar || worker.name.substring(0, 2).toUpperCase()}</div>
                        <div>
                            <strong style="font-size: 0.95rem; color: var(--text-main); display: block;">${worker.name}</strong>
                            <span style="font-size: 0.75rem; color: var(--text-muted);">${worker.role}</span>
                        </div>
                    </div>
                    <div class="site-meta-list">
                        <div class="site-meta-item">
                            <i class="fa-solid fa-id-badge text-amber"></i>
                            <span>Employee ID: <strong>${worker.id}</strong></span>
                        </div>
                        <div class="site-meta-item">
                            <i class="fa-solid fa-phone text-amber"></i>
                            <span>Contact: <strong>${worker.phone || 'No phone'}</strong></span>
                        </div>
                        <div class="site-meta-item">
                            <i class="fa-solid fa-building-flag text-amber"></i>
                            <span>Primary Site: <strong>${worker.primarySiteId || 'SITE-01'}</strong></span>
                        </div>
                    </div>
                </div>
                <div style="display: flex; gap: 0.5rem; margin-top: 1rem; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
                    <button class="btn-secondary-action btn-select-worker-terminal" data-id="${worker.id}" style="flex: 1; justify-content: center; font-size: 0.75rem;">
                        <i class="fa-solid fa-arrow-right-to-bracket"></i> Punch Terminal
                    </button>
                    <button class="btn-secondary-action btn-delete-staff" data-id="${worker.id}" style="color: var(--hazard-red); border-color: rgba(239,68,68,0.3); font-size: 0.75rem;">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            `;
            dom.staffCardsContainer.appendChild(card);
        });

        dom.staffCardsContainer.querySelectorAll('.btn-select-worker-terminal').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.getAttribute('data-id');
                state.currentStaffId = id;
                dom.selectWorker.value = id;
                syncStaffProfile();
                switchPortal('worker');
                showToast(`Switched terminal worker to ${id}`, 'success');
            });
        });

        dom.staffCardsContainer.querySelectorAll('.btn-delete-staff').forEach(btn => {
            btn.addEventListener('click', async () => {
                const id = btn.getAttribute('data-id');
                if (confirm(`Remove worker ${id} from MySQL database?`)) {
                    await window.storageEngine.deleteStaffAsync(id);
                    showToast('Worker removed from MySQL.', 'warning');
                    await renderStaffList();
                    await initStaffSelector();
                    await initLogsFilters();
                }
            });
        });
    }

    dom.btnOpenAddStaffModal.addEventListener('click', async () => {
        const sites = await window.storageEngine.getSitesAsync();
        dom.newStaffSite.innerHTML = '';
        sites.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = `${s.name} (${s.code})`;
            dom.newStaffSite.appendChild(opt);
        });
        dom.addStaffModal.classList.add('open');
    });

    dom.btnCloseStaffModal.addEventListener('click', () => {
        dom.addStaffModal.classList.remove('open');
    });

    dom.btnCancelAddStaff.addEventListener('click', () => {
        dom.addStaffModal.classList.remove('open');
    });

    dom.formAddStaff.addEventListener('submit', async (e) => {
        e.preventDefault();
        const newWorker = {
            name: document.getElementById('newStaffName').value.trim(),
            role: document.getElementById('newStaffRole').value.trim(),
            phone: document.getElementById('newStaffPhone').value.trim(),
            primarySiteId: dom.newStaffSite.value,
            avatar: document.getElementById('newStaffName').value.trim().substring(0, 2).toUpperCase()
        };

        await window.storageEngine.addStaffAsync(newWorker);
        dom.formAddStaff.reset();
        dom.addStaffModal.classList.remove('open');
        showToast(`New worker added to MySQL roster: ${newWorker.name}`, 'success');

        await renderStaffList();
        await initStaffSelector();
        await initLogsFilters();
    });

    // --- INITIALIZATION ---
    initClock();
    initStaffSelector();
    initLogsFilters();
    initMap();

    window.geoEngine.subscribe(handleGeoStateChange);

    // Initial render
    switchPortal('worker');
});
