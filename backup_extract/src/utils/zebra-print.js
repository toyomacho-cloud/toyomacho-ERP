/**
 * Zebra Browser Print Utilities
 * Requires Zebra Browser Print software installed on client PC
 * Download from: https://www.zebra.com/browser-print
 */

let selectedDevice = null;

/**
 * Check if Browser Print is available
 */
export async function isBrowserPrintAvailable() {
    try {
        if (typeof BrowserPrint === 'undefined') {
            return false;
        }
        const devices = await new Promise((resolve, reject) => {
            BrowserPrint.getLocalDevices(
                (devices) => resolve(devices),
                (error) => reject(error),
                'printer'
            );
        });
        return devices && devices.length > 0;
    } catch (error) {
        console.error('Browser Print not available:', error);
        return false;
    }
}

/**
 * Get available Zebra printers
 */
export async function getAvailablePrinters() {
    try {
        if (typeof BrowserPrint === 'undefined') {
            throw new Error('Browser Print not installed');
        }

        const devices = await new Promise((resolve, reject) => {
            BrowserPrint.getLocalDevices(
                (devices) => resolve(devices),
                (error) => reject(error),
                'printer'
            );
        });

        // Filter for Zebra printers
        const zebraPrinters = devices.filter(d =>
            d.name.toLowerCase().includes('zebra') ||
            d.name.toLowerCase().includes('tlp') ||
            d.manufacturer === 'Zebra Technologies'
        );

        return zebraPrinters;
    } catch (error) {
        console.error('Error getting printers:', error);
        return [];
    }
}

/**
 * Get default printer
 */
export async function getDefaultPrinter() {
    try {
        if (typeof BrowserPrint === 'undefined') {
            return null;
        }

        return await new Promise((resolve, reject) => {
            BrowserPrint.getDefaultDevice(
                'printer',
                (device) => resolve(device),
                (error) => reject(error)
            );
        });
    } catch (error) {
        console.error('Error getting default printer:', error);
        return null;
    }
}

/**
 * Select printer for printing
 */
export function selectPrinter(device) {
    selectedDevice = device;
    // Save to localStorage for next time
    if (device) {
        localStorage.setItem('selectedZebraPrinter', device.uid);
    }
}

/**
 * Get currently selected printer
 */
export function getSelectedPrinter() {
    return selectedDevice;
}

/**
 * Print ZPL directly to Zebra printer
 */
export async function printZPLDirect(zplCode) {
    if (!selectedDevice) {
        throw new Error('No printer selected');
    }

    return new Promise((resolve, reject) => {
        selectedDevice.send(
            zplCode,
            () => resolve(true),
            (error) => reject(new Error(error || 'Print failed'))
        );
    });
}

/**
 * Print multiple labels (batch)
 */
export async function printBatchZPLDirect(zplBatch) {
    return printZPLDirect(zplBatch);
}

/**
 * Restore previously selected printer
 */
export async function restoreSelectedPrinter() {
    try {
        const savedUid = localStorage.getItem('selectedZebraPrinter');
        if (!savedUid) return null;

        const printers = await getAvailablePrinters();
        const savedPrinter = printers.find(p => p.uid === savedUid);

        if (savedPrinter) {
            selectPrinter(savedPrinter);
            return savedPrinter;
        }

        return null;
    } catch (error) {
        console.error('Error restoring printer:', error);
        return null;
    }
}
