targetScope = 'resourceGroup'

param location string
param tags object
param containerRegistryName string
param pullIdentityName string
param logAnalyticsWorkspaceName string
param containerAppsEnvironmentName string
param containerAppName string
param containerImage string
param deployContainerApp bool
param supabaseUrl string

@secure()
param supabasePublishableKey string

var acrPullRoleDefinitionId = subscriptionResourceId(
  'Microsoft.Authorization/roleDefinitions',
  '7f951dda-4ed3-4680-a7ca-43fe172d538d'
)
var containerAppUrl = 'https://${containerAppName}.${containerAppsEnvironment.properties.defaultDomain}'

resource containerRegistry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: containerRegistryName
  location: location
  tags: tags
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: false
    dataEndpointEnabled: false
    publicNetworkAccess: 'Enabled'
  }
}

resource pullIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: pullIdentityName
  location: location
  tags: tags
}

resource registryPullAssignment 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(containerRegistry.id, pullIdentity.id, acrPullRoleDefinitionId)
  scope: containerRegistry
  properties: {
    roleDefinitionId: acrPullRoleDefinitionId
    principalId: pullIdentity.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: logAnalyticsWorkspaceName
  location: location
  tags: tags
  properties: {
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
    retentionInDays: 30
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource containerAppsEnvironment 'Microsoft.App/managedEnvironments@2025-07-01' = {
  name: containerAppsEnvironmentName
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logAnalyticsWorkspace.properties.customerId
        sharedKey: logAnalyticsWorkspace.listKeys().primarySharedKey
      }
    }
    publicNetworkAccess: 'Enabled'
    workloadProfiles: [
      {
        name: 'Consumption'
        workloadProfileType: 'Consumption'
      }
    ]
    zoneRedundant: false
  }
}

resource containerApp 'Microsoft.App/containerApps@2025-07-01' = if (deployContainerApp) {
  name: containerAppName
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${pullIdentity.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironment.id
    workloadProfileName: 'Consumption'
    configuration: {
      activeRevisionsMode: 'Single'
      maxInactiveRevisions: 2
      ingress: {
        allowInsecure: false
        external: true
        targetPort: 3000
        traffic: [
          {
            latestRevision: true
            weight: 100
          }
        ]
        transport: 'auto'
      }
      registries: [
        {
          server: containerRegistry.properties.loginServer
          identity: pullIdentity.id
        }
      ]
      secrets: [
        {
          name: 'supabase-publishable-key'
          value: supabasePublishableKey
        }
      ]
    }
    template: {
      containers: [
        {
          name: 'subtrack'
          image: containerImage
          env: [
            {
              name: 'NODE_ENV'
              value: 'production'
            }
            {
              name: 'APP_URL'
              value: containerAppUrl
            }
            {
              name: 'DEPLOYMENT_STAGE'
              value: 'preview'
            }
            {
              name: 'ALLOW_UNVERIFIED_EMAIL'
              value: 'true'
            }
            {
              name: 'NEXT_PUBLIC_SUPABASE_URL'
              value: supabaseUrl
            }
            {
              name: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'
              secretRef: 'supabase-publishable-key'
            }
          ]
          probes: [
            {
              type: 'Startup'
              httpGet: {
                path: '/api/health'
                port: 3000
                scheme: 'HTTP'
              }
              failureThreshold: 30
              initialDelaySeconds: 1
              periodSeconds: 3
              successThreshold: 1
              timeoutSeconds: 2
            }
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health'
                port: 3000
                scheme: 'HTTP'
              }
              failureThreshold: 3
              initialDelaySeconds: 15
              periodSeconds: 30
              successThreshold: 1
              timeoutSeconds: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/health'
                port: 3000
                scheme: 'HTTP'
              }
              failureThreshold: 6
              initialDelaySeconds: 3
              periodSeconds: 5
              successThreshold: 1
              timeoutSeconds: 3
            }
          ]
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 1
        rules: [
          {
            name: 'http-concurrency'
            http: {
              metadata: {
                concurrentRequests: '20'
              }
            }
          }
        ]
      }
    }
  }
  dependsOn: [
    registryPullAssignment
  ]
}

output registryLoginServer string = containerRegistry.properties.loginServer
output deployedUrl string = deployContainerApp ? containerAppUrl : ''