import { LightningElement, api, track, wire } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';
import analyzeFiles from '@salesforce/apex/AIFileAnalysisController.analyzeFiles';
import getRelatedFiles from '@salesforce/apex/AIFileAnalysisController.getRelatedFiles';
import getOrgBaseUrl from '@salesforce/apex/AIFileAnalysisController.getOrgBaseUrl'; // Import new Apex method
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class AIFileAnalysisController extends NavigationMixin(LightningElement) {
    @api recordId;
    @api flowApiName = 'Process_AI_Analysis_Result';

    @track uploadedFileId;
    @track uploadedFileName;
    @track aiResult = '';
    @track errorMessage = '';
    @track isLoading = false;
    @track disableAnalyzeButton = true;

    @track showActionToast = false;
    @track actionToastMessage = '';

    @track fileOptions = [];
    @track orgBaseUrl; // Property to hold the org's base URL

    _wiredFilesResult;

    // Wire to get the org's base URL
    @wire(getOrgBaseUrl)
    wiredOrgUrl({ error, data }) {
        if (data) {
            this.orgBaseUrl = data;
        } else if (error) {
            console.error('Error fetching org base URL:', error);
            this.showToastMessage('Error', 'Could not determine org URL.', 'error');
        }
    }

    @wire(getRelatedFiles, { recordId: '$recordId' })
    wiredFiles(result) {
        this._wiredFilesResult = result; 
        if (result.data) {
            this.fileOptions = result.data;
            this.errorMessage = undefined;
        } else if (result.error) {
            this.errorMessage = 'Could not load existing files.';
            this.fileOptions = [];
            console.error('Error fetching files:', JSON.stringify(result.error, null, 2));
        }
    }

    get hasFiles() {
        return this.fileOptions && this.fileOptions.length > 0;
    }

    get uploadRecordId() {
        return this.recordId;
    }

    resetSelectionState() {
        this.aiResult = '';
        this.errorMessage = '';
        this.uploadedFileId = null;
        this.uploadedFileName = null;
        this.disableAnalyzeButton = true;
    }

    fileUploadHandler(event) {
        this.resetSelectionState();
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

    handleFileSelectionChange(event) {
        this.resetSelectionState();
        this.uploadedFileId = event.detail.value;
        const selectedOption = this.fileOptions.find(option => option.value === this.uploadedFileId);
        if (selectedOption) {
            this.uploadedFileName = selectedOption.label;
        }
        this.disableAnalyzeButton = false;
    }

    async handleAnalyzeFiles() {
        if (!this.uploadedFileId) {
            this.errorMessage = 'Please select a file to analyze first.';
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
        }
    }

    handleAddToCase() {
        this.showSimpleActionToast('Added to Case (demo only)');
    }

    handleCopyToClipboard() {
        const tempElement = document.createElement('div');
        tempElement.innerHTML = this.aiResult;
        const plainText = tempElement.innerText || tempElement.textContent || "";
        navigator.clipboard.writeText(plainText);
        this.showSimpleActionToast('Copied to clipboard!');
    }

    handleStartFlow() {
        if (!this.flowApiName) {
            this.showToastMessage('Configuration Error', 'Flow API Name is not available.', 'error');
            return;
        }

        const tempElement = document.createElement('div');
        tempElement.innerHTML = this.aiResult;
        const plainTextResult = tempElement.innerText || tempElement.textContent || "";

        // URL-encode the parameters to ensure they are passed correctly
        const encodedResult = encodeURIComponent(plainTextResult);

        // Construct the relative URL with parameters. This is more reliable than using the absolute URL.
        let flowUrl = `/flow/${this.flowApiName}`;
        flowUrl += `?input_AIAnalysisResult=${encodedResult}`;
        flowUrl += `&recordId=${this.recordId}`;
        
        console.log(`Opening new tab with relative URL: ${flowUrl}`);

        // Use window.open, which we've confirmed works, with the full parameter string.
        window.open(flowUrl, '_blank');
    }

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
