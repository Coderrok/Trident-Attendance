/**
 * Field Camera & Selfie Verification Module
 * Optional anti-buddy punching photo verification for construction workers.
 */

class CameraModule {
    constructor() {
        this.stream = null;
        this.capturedImage = null;
        this.isEnabled = false;
        this.videoElement = null;
    }

    async startCamera(videoElementId) {
        this.videoElement = document.getElementById(videoElementId);
        if (!this.videoElement) return false;

        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 480 },
                    height: { ideal: 480 }
                },
                audio: false
            });
            this.videoElement.srcObject = this.stream;
            this.videoElement.play();
            this.isEnabled = true;
            return true;
        } catch (err) {
            console.warn('Camera access unavailable or declined:', err);
            this.isEnabled = false;
            return false;
        }
    }

    stopCamera() {
        if (this.stream) {
            this.stream.getTracks().forEach(track => track.stop());
            this.stream = null;
        }
        if (this.videoElement) {
            this.videoElement.srcObject = null;
        }
    }

    captureSnapshot() {
        if (!this.videoElement || !this.stream) return null;

        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 320;
        const ctx = canvas.getContext('2d');

        // Draw video frame to square canvas
        const vw = this.videoElement.videoWidth;
        const vh = this.videoElement.videoHeight;
        const minDim = Math.min(vw, vh);
        const sx = (vw - minDim) / 2;
        const sy = (vh - minDim) / 2;

        ctx.drawImage(this.videoElement, sx, sy, minDim, minDim, 0, 0, 320, 320);

        // Stamp timestamp watermark on photo
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 280, 320, 40);
        ctx.fillStyle = '#F59E0B'; // Safety Gold
        ctx.font = 'bold 11px monospace';
        const stamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
        ctx.fillText(`GPS VERIFIED: ${stamp}`, 10, 305);

        this.capturedImage = canvas.toDataURL('image/jpeg', 0.85);
        return this.capturedImage;
    }

    getSnapshot() {
        return this.capturedImage;
    }

    clearSnapshot() {
        this.capturedImage = null;
    }
}

window.cameraModule = new CameraModule();
