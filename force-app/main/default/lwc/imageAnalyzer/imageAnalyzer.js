import { LightningElement, api, track } from 'lwc';
import analyzeFiles from '@salesforce/apex/AIFileAnalysisController.analyzeFiles';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class AIFileAnalysisController extends LightningElement {
    @api recordId; //  recordId
    @track uploadedFileId;
    @track uploadedFileName;
    @track aiResult = '';
    @track errorMessage = '';
    @track isLoading = false;
    @track disableAnalyzeButton = true;

    @track showActionToast = false;
    @track actionToastMessage = '';

    get uploadRecordId() {
        return this.recordId;
    }

    fileUploadHandler(event) {
        const uploadedFiles = event.detail.files;
        if (uploadedFiles && uploadedFiles.length > 0) {
            this.uploadedFileId = uploadedFiles[0].documentId;
            this.uploadedFileName = uploadedFiles[0].name;
            this.disableAnalyzeButton = false;
            this.showToastMessage(
                'File Uploaded',
                `${this.uploadedFileName} has been uploaded successfully`,
                'success'
            );
        }
    }

    async handleAnalyzeFiles() {
        if (!this.uploadedFileId) {
            this.errorMessage = 'No file uploaded for analysis.';
            return;
        }
        this.isLoading = true;
        this.errorMessage = '';
        this.aiResult = '';
        try {
            const result = await analyzeFiles({ fileId: this.uploadedFileId });
            this.aiResult = result;
            this.showToastMessage(
                'AI Analysis Complete',
                'The AI-powered analysis is now ready!',
                'success'
            );
        } catch (err) {
            this.errorMessage =
                (err && err.body && err.body.message) ||
                'Error analyzing file. Please try again.';
            this.showToastMessage(
                'Analysis Error',
                this.errorMessage,
                'error'
            );
        } finally {
            this.isLoading = false;
            this.disableAnalyzeButton = true;
        }
    }

    // --- Button Group Handlers ---
    handleAddToCase() {
        // Placeholder for action (show a toast for demo)
        this.showSimpleActionToast('Added to Case (demo only)');
    }

    handleCopyToClipboard() {
        // Strip HTML for copy
        const tempElement = document.createElement('div');
        tempElement.innerHTML = this.aiResult;
        const plainText = tempElement.innerText || tempElement.textContent;
        navigator.clipboard.writeText(plainText);
        this.showSimpleActionToast('Copied to clipboard!');
    }

    /*
    handleDownloadPdf() {
        // Not implemented: Demo only
        this.showSimpleActionToast('Download as PDF (not implemented)');
    }
    */

    showSimpleActionToast(msg) {
        this.actionToastMessage = msg;
        this.showActionToast = true;
        setTimeout(() => { this.showActionToast = false; }, 1500);
    }

    showToastMessage(title, message, variant) {
        this.dispatchEvent(
            new ShowToastEvent({
                title: title,
                message: message,
                variant: variant || 'info'
            })
        );
    }
}