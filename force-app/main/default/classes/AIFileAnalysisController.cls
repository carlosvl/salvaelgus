public without sharing class AIFileAnalysisController {
    
    /**
     * Wrapper class to format file data for the LWC's combobox component.
     */
    public class FileOption {
        @AuraEnabled
        public String label {get; set;} // This will be the file name
        @AuraEnabled
        public String value {get; set;} // This will be the file's ID

        public FileOption(String label, String value) {
            this.label = label;
            this.value = value;
        }
    }
    
    /**
     * NEW: This method returns the base URL for the current Salesforce org.
     * This is used to construct an absolute URL for flow navigation, making it more reliable.
     * @return String representing the org's base URL (e.g., https://yourdomain.lightning.force.com)
     */
    @AuraEnabled(cacheable=true)
    public static String getOrgBaseUrl() {
        return URL.getOrgDomainUrl().toExternalForm();
    }

    @AuraEnabled(cacheable=true)
    public static List<FileOption> getRelatedFiles(String recordId) {
        List<FileOption> options = new List<FileOption>();
        Set<Id> contentDocumentIds = new Set<Id>();

        for (ContentDocumentLink cdl : [
            SELECT ContentDocumentId 
            FROM ContentDocumentLink 
            WHERE LinkedEntityId = :recordId
        ]) {
            contentDocumentIds.add(cdl.ContentDocumentId);
        }

        if (!contentDocumentIds.isEmpty()) {
            for (ContentDocument cd : [
                SELECT Id, Title 
                FROM ContentDocument 
                WHERE Id IN :contentDocumentIds
                ORDER BY Title ASC
            ]) {
                options.add(new FileOption(cd.Title, cd.Id));
            }
        }
        return options;
    }

    @AuraEnabled(cacheable=false)
    public static String analyzeFiles(String fileId) {
        try {
            ConnectApi.EinsteinPromptTemplateGenerationsInput promptInput = new ConnectApi.EinsteinPromptTemplateGenerationsInput();
            promptInput.isPreview = false;

            Map<String, String> cMap = new Map<String, String>();
            cMap.put('id', fileId);

            ConnectApi.WrappedValue cWrapped = new ConnectApi.WrappedValue();
            cWrapped.value = cMap;

            Map<String, ConnectApi.WrappedValue> inputValues = new Map<String, ConnectApi.WrappedValue>();
            inputValues.put('Input:Analyze_Files', cWrapped);

            promptInput.inputParams = inputValues;
            
            promptInput.additionalConfig = new ConnectApi.EinsteinLlmAdditionalConfigInput();
            promptInput.additionalConfig.applicationName = 'PromptTemplateGenerationsInvocable';

            ConnectApi.EinsteinPromptTemplateGenerationsRepresentation result = 
                ConnectApi.EinsteinLLM.generateMessagesForPromptTemplate('Analyze_Files', promptInput);
            
            return result.generations[0].text;

        } catch (Exception e) {
            System.debug('Error calling Einstein: ' + e.getMessage());
            return 'Error: ' + e.getMessage();
        }
    }
}
