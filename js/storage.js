/**
 * Storage & Data Engine for Construction Staff Attendance
 * Fully connected to XAMPP MySQL Database: `construction_attendance_db`
 * Includes automatic fallback and local caching.
 */

const STORAGE_KEYS = {
    ATTENDANCE: 'sitepulse_attendance_records',
    SITES: 'sitepulse_construction_sites',
    STAFF: 'sitepulse_staff_members',
    SETTINGS: 'sitepulse_app_settings'
};

const API_BASE = window.location.pathname.includes('/construction-attendance')
    ? '/construction-attendance/api'
    : 'http://127.0.0.1/construction-attendance/api';

class StorageEngine {
    constructor() {
        this.isMySQLEnabled = true;
        this.cachedSites = [];
        this.cachedStaff = [];
        this.cachedAttendance = [];
        this.init();
    }

    async init() {
        try {
            await this.testMySQLConnection();
        } catch (e) {
            console.warn('MySQL API not responding, running with local storage cache:', e);
            this.isMySQLEnabled = false;
        }
    }

    async testMySQLConnection() {
        const res = await fetch(`${API_BASE}/sites.php`, { cache: 'no-cache' });
        if (res.ok) {
            const json = await res.json();
            if (json.success && Array.isArray(json.data)) {
                this.isMySQLEnabled = true;
                this.cachedSites = json.data;
                localStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify(json.data));
                this.updateDbStatusBadge('MySQL Active (construction_attendance_db)', true);
                return true;
            }
        }
        throw new Error('MySQL response not OK');
    }

    updateDbStatusBadge(text, isConnected) {
        const badge = document.getElementById('dbStatusBadge');
        if (badge) {
            badge.textContent = text;
            badge.style.display = 'inline-flex';
            badge.className = isConnected ? 'status-badge safe' : 'status-badge warning';
        }
    }

    // --- SITES ---
    async getSitesAsync() {
        if (this.isMySQLEnabled) {
            try {
                const res = await fetch(`${API_BASE}/sites.php`);
                const json = await res.json();
                if (json.success) {
                    this.cachedSites = json.data;
                    localStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify(json.data));
                    return json.data;
                }
            } catch (e) {
                console.warn('Fallback to local sites:', e);
            }
        }
        return this.getSites();
    }

    getSites() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.SITES);
            return data ? JSON.parse(data) : (this.cachedSites.length ? this.cachedSites : []);
        } catch (e) {
            return [];
        }
    }

    async addSiteAsync(site) {
        if (this.isMySQLEnabled) {
            try {
                const res = await fetch(`${API_BASE}/sites.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(site)
                });
                const json = await res.json();
                if (json.success) {
                    await this.getSitesAsync();
                    return json.data;
                }
            } catch (e) {
                console.warn('Error saving site to MySQL:', e);
            }
        }
        return this.addSite(site);
    }

    addSite(site) {
        const sites = this.getSites();
        site.id = `SITE-${String(sites.length + 1).padStart(2, '0')}`;
        sites.push(site);
        localStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify(sites));
        return site;
    }

    async deleteSiteAsync(siteId) {
        if (this.isMySQLEnabled) {
            try {
                const res = await fetch(`${API_BASE}/sites.php?id=${encodeURIComponent(siteId)}`, {
                    method: 'DELETE'
                });
                const json = await res.json();
                if (json.success) {
                    await this.getSitesAsync();
                    return;
                }
            } catch (e) {
                console.warn('Error deleting site from MySQL:', e);
            }
        }
        this.deleteSite(siteId);
    }

    deleteSite(siteId) {
        let sites = this.getSites();
        sites = sites.filter(s => s.id !== siteId);
        localStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify(sites));
    }

    // --- STAFF ---
    async getStaffAsync() {
        if (this.isMySQLEnabled) {
            try {
                const res = await fetch(`${API_BASE}/staff.php`);
                const json = await res.json();
                if (json.success) {
                    this.cachedStaff = json.data;
                    localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(json.data));
                    return json.data;
                }
            } catch (e) {
                console.warn('Fallback to local staff:', e);
            }
        }
        return this.getStaff();
    }

    getStaff() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.STAFF);
            return data ? JSON.parse(data) : (this.cachedStaff.length ? this.cachedStaff : []);
        } catch (e) {
            return [];
        }
    }

    async addStaffAsync(staff) {
        if (this.isMySQLEnabled) {
            try {
                const res = await fetch(`${API_BASE}/staff.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(staff)
                });
                const json = await res.json();
                if (json.success) {
                    await this.getStaffAsync();
                    return json.data;
                }
            } catch (e) {
                console.warn('Error saving staff to MySQL:', e);
            }
        }
        return this.addStaff(staff);
    }

    addStaff(staff) {
        const list = this.getStaff();
        staff.id = `EMP-${String(list.length + 101).padStart(3, '0')}`;
        list.push(staff);
        localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(list));
        return staff;
    }

    async deleteStaffAsync(staffId) {
        if (this.isMySQLEnabled) {
            try {
                const res = await fetch(`${API_BASE}/staff.php?id=${encodeURIComponent(staffId)}`, {
                    method: 'DELETE'
                });
                const json = await res.json();
                if (json.success) {
                    await this.getStaffAsync();
                    return;
                }
            } catch (e) {
                console.warn('Error deleting staff from MySQL:', e);
            }
        }
        this.deleteStaff(staffId);
    }

    deleteStaff(staffId) {
        let list = this.getStaff();
        list = list.filter(w => w.id !== staffId);
        localStorage.setItem(STORAGE_KEYS.STAFF, JSON.stringify(list));
    }

    // --- ATTENDANCE RECORDS ---
    async queryAttendanceAsync(params = {}) {
        if (this.isMySQLEnabled) {
            try {
                const urlParams = new URLSearchParams();
                Object.keys(params).forEach(k => {
                    if (params[k] !== null && params[k] !== undefined) {
                        urlParams.append(k, params[k]);
                    }
                });

                const res = await fetch(`${API_BASE}/attendance.php?${urlParams.toString()}`);
                const json = await res.json();
                if (json.success) {
                    return {
                        records: json.records,
                        allFilteredRecords: json.records,
                        totalRecords: json.totalRecords,
                        totalPages: json.totalPages,
                        currentPage: json.currentPage,
                        pageSize: json.pageSize,
                        stats: json.stats
                    };
                }
            } catch (e) {
                console.warn('MySQL query error, using local fallback:', e);
            }
        }

        return this.queryAttendance(params);
    }

    queryAttendance({ dateRange = '30days', startDate = null, endDate = null, siteId = 'all', staffId = 'all', status = 'all', page = 1, pageSize = 15 }) {
        let records = this.getAttendanceRecords();
        const now = new Date();

        if (dateRange === 'today') {
            const todayStr = now.toISOString().split('T')[0];
            records = records.filter(r => r.date === todayStr);
        } else if (dateRange === '7days') {
            const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            records = records.filter(r => new Date(r.checkIn.timestamp) >= cutoff);
        } else if (dateRange === '30days') {
            const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            records = records.filter(r => new Date(r.checkIn.timestamp) >= cutoff);
        } else if (dateRange === 'custom' && startDate && endDate) {
            records = records.filter(r => r.date >= startDate && r.date <= endDate);
        }

        if (siteId && siteId !== 'all') {
            records = records.filter(r => r.siteId === siteId);
        }

        if (staffId && staffId !== 'all') {
            records = records.filter(r => r.staffId === staffId);
        }

        if (status && status !== 'all') {
            if (status === 'Present') {
                records = records.filter(r => r.status.includes('Present') || r.status.includes('Overtime'));
            } else if (status === 'Late') {
                records = records.filter(r => r.status.includes('Late'));
            } else if (status === 'Flagged') {
                records = records.filter(r => r.geofenceFlag.includes('Flagged') || (r.checkIn && !r.checkIn.geofenceVerified));
            } else if (status === 'Active') {
                records = records.filter(r => r.checkOut === null);
            }
        }

        const totalRecords = records.length;
        const totalPages = Math.ceil(totalRecords / pageSize) || 1;
        const validPage = Math.max(1, Math.min(page, totalPages));
        const startIndex = (validPage - 1) * pageSize;
        const paginatedRecords = records.slice(startIndex, startIndex + pageSize);

        const totalHours = records.reduce((acc, r) => acc + (r.totalHoursDecimal || 0), 0);
        const onSiteCount = records.filter(r => r.checkIn && r.checkIn.geofenceVerified).length;
        const complianceRate = totalRecords > 0 ? Math.round((onSiteCount / totalRecords) * 100) : 100;
        const lateCount = records.filter(r => r.status.includes('Late')).length;

        return {
            records: paginatedRecords,
            allFilteredRecords: records,
            totalRecords,
            totalPages,
            currentPage: validPage,
            pageSize,
            stats: {
                totalShifts: totalRecords,
                totalHours: totalHours.toFixed(1),
                complianceRate,
                lateCount,
                activeShifts: records.filter(r => r.checkOut === null).length
            }
        };
    }

    getAttendanceRecords() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.ATTENDANCE);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            return [];
        }
    }

    async addAttendanceRecordAsync(record) {
        if (this.isMySQLEnabled) {
            try {
                const res = await fetch(`${API_BASE}/attendance.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'checkin', record: record })
                });
                const json = await res.json();
                if (json.success) {
                    this.addAttendanceRecord(record);
                    return record;
                }
            } catch (e) {
                console.warn('MySQL insert failed, cached locally:', e);
            }
        }
        return this.addAttendanceRecord(record);
    }

    addAttendanceRecord(record) {
        const records = this.getAttendanceRecords();
        records.unshift(record);
        localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
        return record;
    }

    async updateAttendanceRecordAsync(id, updates) {
        if (this.isMySQLEnabled) {
            try {
                const res = await fetch(`${API_BASE}/attendance.php`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ action: 'checkout', id: id, updates: updates })
                });
                const json = await res.json();
                if (json.success) {
                    return this.updateAttendanceRecord(id, updates);
                }
            } catch (e) {
                console.warn('MySQL update failed, updated locally:', e);
            }
        }
        return this.updateAttendanceRecord(id, updates);
    }

    updateAttendanceRecord(id, updates) {
        const records = this.getAttendanceRecords();
        const index = records.findIndex(r => r.id === id);
        if (index !== -1) {
            records[index] = { ...records[index], ...updates };
            localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
            return records[index];
        }
        return null;
    }

    async getActivePunchForStaffAsync(staffId) {
        if (this.isMySQLEnabled) {
            try {
                const queryRes = await this.queryAttendanceAsync({ staffId: staffId, status: 'Active', pageSize: 1 });
                if (queryRes.records && queryRes.records.length > 0) {
                    return queryRes.records[0];
                }
                return null;
            } catch (e) {
                // fallback
            }
        }
        return this.getActivePunchForStaff(staffId);
    }

    getActivePunchForStaff(staffId) {
        const records = this.getAttendanceRecords();
        return records.find(r => r.staffId === staffId && r.checkOut === null) || null;
    }

    async resetToDemoDataAsync() {
        if (this.isMySQLEnabled) {
            try {
                const res = await fetch(`${API_BASE}/seed.php`);
                const json = await res.json();
                if (json.success) {
                    await this.getSitesAsync();
                    await this.getStaffAsync();
                    return json;
                }
            } catch (e) {
                console.warn('Error resetting MySQL data:', e);
            }
        }
        return null;
    }
}

window.storageEngine = new StorageEngine();
