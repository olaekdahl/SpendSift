targetScope = 'subscription'

@description('Azure region for every preview resource.')
param location string = 'westeurope'

@description('Dedicated resource group that contains only this preview deployment.')
param resourceGroupName string = 'rg-subtrack-preview-weu'

@description('Globally unique, lower-case Azure Container Registry name.')
param containerRegistryName string = 'acrsubtrackpreve82d'

@description('User-assigned identity used only to pull images from the preview registry.')
param pullIdentityName string = 'id-subtrack-preview-acr'

@description('Log Analytics workspace with short preview retention.')
param logAnalyticsWorkspaceName string = 'log-subtrack-preview-weu'

@description('Azure Container Apps managed environment name.')
param containerAppsEnvironmentName string = 'cae-subtrack-preview-weu'

@description('Azure Container App name.')
param containerAppName string = 'ca-subtrack-preview'

@description('Immutable application image reference. Required when deployContainerApp is true.')
param containerImage string = ''

@description('Create or update the Container App after its image exists in the registry.')
param deployContainerApp bool = false

@description('Browser-safe URL for the separate preview Supabase project.')
param supabaseUrl string = ''

@secure()
@description('Browser-safe publishable key for the separate preview Supabase project. Azure stores it as a Container Apps secret.')
param supabasePublishableKey string = ''

var tags = {
  application: 'subtrack'
  environment: 'preview'
  managedBy: 'bicep'
  dataClassification: 'fictional-only'
}

resource previewResourceGroup 'Microsoft.Resources/resourceGroups@2022-09-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module previewResources 'resources.bicep' = {
  name: 'subtrack-preview-resources'
  scope: previewResourceGroup
  params: {
    location: location
    tags: tags
    containerRegistryName: containerRegistryName
    pullIdentityName: pullIdentityName
    logAnalyticsWorkspaceName: logAnalyticsWorkspaceName
    containerAppsEnvironmentName: containerAppsEnvironmentName
    containerAppName: containerAppName
    containerImage: containerImage
    deployContainerApp: deployContainerApp
    supabaseUrl: supabaseUrl
    supabasePublishableKey: supabasePublishableKey
  }
}

output resourceGroupName string = previewResourceGroup.name
output registryLoginServer string = previewResources.outputs.registryLoginServer
output containerAppName string = containerAppName
output deployedUrl string = previewResources.outputs.deployedUrl