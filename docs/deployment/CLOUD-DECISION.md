# Cloud deployment decision

## Decision status

**Selected:** Azure Container Apps on the Consumption plan in West Europe.

**Deployment status:** Deployed as the approved fictional-data preview on 2026-09-18. Production approval remains blocked.

**Decision date:** 2026-09-18.

This decision applies only to a non-production preview that uses fictional data and a separate non-production Supabase project.

## Verified application requirements

The repository audit established these requirements:

| Requirement         | Repository evidence                                                                                                                      | Deployment effect                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Framework           | Next.js 16.3.5 and React 19.2.8 are locked in `package-lock.json`.                                                                       | The platform must support Next.js 16 without a downgrade.                          |
| Runtime             | The full release gate and build pass with Node.js 24.16.0. The package does not declare an `engines` range.                              | Use the current Node.js 24 LTS major for the build and runtime image.              |
| Rendering           | The App Router contains static and dynamically rendered routes, React Server Components, five loading boundaries, and dynamic user data. | Static export is not compatible.                                                   |
| Server features     | The application uses Server Actions, route handlers, and Next.js 16 proxy middleware.                                                    | Use a full Node.js or Docker runtime.                                              |
| Authentication      | Supabase SSR manages email/password authentication, PKCE callbacks, cookies, and session refresh.                                        | The deployment needs stable HTTPS, exact callback URLs, and runtime configuration. |
| Authorization       | Reviewed migrations enable Row Level Security, and 191 database assertions cover owner isolation.                                        | Ordinary traffic must retain the publishable key and signed-in user session model. |
| Secrets             | Application code does not use a service-role or secret key.                                                                              | Do not add one to the container app.                                               |
| Environment         | `APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are required.                                          | Supply values at runtime without storing them in source or the image.              |
| Email policy        | Hosted Supabase enables email confirmation by default. The preview requires it disabled temporarily.                                     | Use a separate preview project and a server-enforced preview safety guard.         |
| Health              | No health endpoint exists.                                                                                                               | Add a content-free `/api/health` endpoint and HTTP probes.                         |
| Packaging           | `output: "standalone"` is not configured.                                                                                                | Enable standalone output and build a minimal multi-stage image.                    |
| Data classification | Statement imports may contain financial data, but this preview prohibits real data.                                                      | Display a persistent warning and test only with fictional fixtures.                |

The application does not currently import `next/image`. It still exposes the framework image path through the proxy matcher. The application uses loading boundaries, but direct `ReadableStream` or `after()` use was not found.

Authentication callback and reset URLs are not hard-coded. Server actions derive them from the validated `APP_URL` origin.

## Verification evidence

The pre-deployment checks produced these results on 2026-09-18:

- Formatting, linting, and TypeScript checks passed.
- All 156 Vitest tests passed.
- Database linting passed.
- All 191 pgTAP database assertions passed.
- One of 76 Playwright scenarios timed out once while waiting five seconds for CSV column mapping. The focused scenario then passed in both desktop and mobile projects, and the complete 76-scenario suite passed on rerun.
- The Next.js production build passed.
- The production cache-isolation browser test passed.
- `npm audit` reported zero vulnerabilities across 588 dependency nodes.
- The final repository security checkpoint records zero exposed secrets and zero confirmed reachable Critical or High findings.

The preview must still verify the hosted ingress, HTTPS, logs, cache behavior, authentication, and two-user isolation after deployment. Real financial data remains prohibited.

## Options evaluated

| Criterion               | Azure Container Apps                                                                                                                      | AWS Amplify Hosting                                                                               | AWS App Runner                                                                                         | Amazon ECS on Fargate                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Framework compatibility | Runs the standard Next.js 16 standalone container with full Docker feature support.                                                       | Official managed SSR support covers Next.js 12 through 15, not 16. Streaming is also unsupported. | A container can run Next.js 16.                                                                        | A container can run Next.js 16.                                                                                             |
| Deployment complexity   | One resource group, one registry, one managed environment, one app, one identity, and one log workspace.                                  | Low, but incompatible with the installed framework.                                               | Low to moderate, but the service is closed to new AWS customers.                                       | High. Requires ECR, ECS, task and service definitions, networking, load balancing, IAM, and logs.                           |
| Low-traffic cost        | Consumption compute and requests can fit inside the subscription's monthly free grant. Basic ACR costs about USD 5.07 per 30.4-day month. | Potentially low, but compatibility blocks selection.                                              | At least one provisioned instance retains an idle memory charge unless an operator pauses the service. | Task, load balancer, public IPv4, logs, and transfer charges create a higher idle baseline.                                 |
| Scale to zero           | Yes. HTTP ingress can activate an app configured with zero minimum replicas.                                                              | Managed by the service, but the unsupported framework makes this irrelevant.                      | No automatic zero-instance state for an available service.                                             | Not a practical request-driven zero-to-one web architecture without extra services.                                         |
| Operational burden      | Low. Azure manages HTTPS ingress, revisions, health, and HTTP scaling.                                                                    | Lowest if compatible.                                                                             | Low, if the account already has service access.                                                        | Highest of the evaluated options.                                                                                           |
| Security                | Managed HTTPS ingress, managed identity for ACR pull, runtime secret references, resource-group isolation, and centralized logs.          | Managed edge and secrets, but unsupported framework behavior is an unacceptable risk.             | Managed HTTPS and IAM, with ECR and CloudWatch configuration.                                          | Strong controls are available but require more IAM, network, load balancer, and logging configuration.                      |
| Supabase compatibility  | Stable HTTPS origin and full Node.js runtime support SSR cookies and callbacks.                                                           | Framework limits create callback and rendering risk.                                              | Compatible.                                                                                            | Compatible.                                                                                                                 |
| Portability             | Standard OCI image and Next.js standalone server.                                                                                         | Platform-specific build output.                                                                   | Standard OCI image.                                                                                    | Standard OCI image.                                                                                                         |
| Rollback                | Activate a previous immutable Container Apps revision.                                                                                    | Managed hosting rollback, subject to framework support.                                           | Redeploy an earlier ECR image.                                                                         | Update the service to an earlier task definition.                                                                           |
| Cleanup                 | Delete the dedicated resource group only.                                                                                                 | Delete the Amplify app and associated resources.                                                  | Delete the service, ECR repository, roles, and logs.                                                   | Delete the ECS service, cluster resources, load balancer, target group, network additions, ECR repository, roles, and logs. |
| CLI automation          | Bicep, Azure CLI validation, and Azure what-if are supported.                                                                             | CLI and CloudFormation are available.                                                             | CLI and CloudFormation are available to eligible accounts.                                             | CLI and CloudFormation are available but require substantially more infrastructure.                                         |

## Compatibility evidence

- [Next.js deployment documentation](https://nextjs.org/docs/app/getting-started/deploying) states that Docker and Node.js deployments support all Next.js features. The installed Next.js 16.3.5 documentation says the same.
- [Next.js standalone output documentation](https://nextjs.org/docs/app/api-reference/config/next-config-js/output) defines the minimal server output and the `PORT` and `HOSTNAME` runtime settings.
- [Azure Container Apps overview](https://learn.microsoft.com/azure/container-apps/overview) documents managed HTTPS ingress, OCI registries, revisions, secrets, logs, and scale-to-zero support.
- [Azure Container Apps scaling documentation](https://learn.microsoft.com/azure/container-apps/scale-app) documents the default HTTP scale range and a minimum replica count of zero.
- [AWS Amplify Next.js support](https://docs.aws.amazon.com/amplify/latest/userguide/ssr-amplify-support.html) limits managed SSR support to Next.js 12 through 15 and lists streaming as unsupported.
- [AWS App Runner documentation](https://docs.aws.amazon.com/apprunner/latest/dg/what-is-apprunner.html) states that App Runner is no longer open to new customers.

## Account and service readiness

Read-only CLI checks found:

- Azure CLI 2.87.0 is authenticated to the selected `Purchase Portal Beta Refactor` subscription.
- `Microsoft.App`, `Microsoft.ContainerRegistry`, and `Microsoft.OperationalInsights` are registered.
- West Europe supports Container Apps and managed environments.
- West Europe currently reports zero of 20 managed environments in use for the selected subscription.
- The proposed resource group does not exist, and the proposed registry name is available.
- AWS CLI 2.31.35 is installed, but no AWS credentials or region are configured. Account-specific AWS quota and name checks were therefore unavailable.
- Supabase CLI 2.117.0 is installed, but no hosted-project session is available. Only the disposable local Supabase stack is configured.

No Azure quota issue blocks the proposed preview.

## Proposed Azure architecture

Create only these resources in a dedicated resource group:

- One Basic Azure Container Registry.
- One user-assigned managed identity with `AcrPull` scoped only to the registry.
- One Log Analytics workspace with 30-day retention.
- One Container Apps managed environment on the Consumption plan.
- One externally accessible Container App with managed HTTPS ingress.

Configure the app with 0.5 vCPU, 1 GiB memory, zero minimum replicas, and one maximum replica. Use single-revision mode and HTTP startup, liveness, and readiness probes against `/api/health`. Do not add a custom virtual network, custom domain, Key Vault, Application Insights, or premium workload profile for this preview.

## Cost estimate

The estimate uses public USD retail rates and assumes low traffic, short requests, one small image, less than 1 GB of logs per month, and no paid Supabase plan:

| Item                            | Estimated monthly cost | Idle behavior                                                                                                                                       |
| ------------------------------- | ---------------------: | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Container Apps Consumption      |             USD 0 to 2 | Zero replicas incur no compute charge. The subscription receives 180,000 vCPU-seconds, 360,000 GiB-seconds, and 2 million requests free each month. |
| Basic Azure Container Registry  |         About USD 5.07 | Continues charging about USD 0.1666 per day while provisioned.                                                                                      |
| Log Analytics                   |          USD 0 to 2.30 | Usage-based. Analytics Logs include 31 days of retention and list a USD 2.30 per GB ingestion rate.                                                 |
| Network egress                  |             USD 0 to 1 | Usage-based and expected to remain minimal for this preview.                                                                                        |
| Hosted Supabase preview project |          USD 0 assumed | Requires a separate project. A paid organization or plan can add charges outside this Azure estimate.                                               |

**Expected preview total:** About USD 5 to 10 per month. Actual charges depend on the selected Azure offer, existing use of monthly Container Apps grants in the subscription, log volume, egress, and Supabase plan.

The registry is the main charge that continues while the app has zero replicas. Log storage and network use can also generate charges.

## Risks and tradeoffs

- Scale-to-zero introduces a cold start after idle periods.
- A shared Azure subscription means the monthly Container Apps free grant might already be partly consumed.
- A private ACR creates a predictable monthly idle charge.
- Azure Container Apps terminates TLS and controls forwarded headers, but the deployment must verify the exact client-IP behavior before relying on network-aware rate limits.
- Container Apps ingress does not replace a full web application firewall. This preview must remain fictional-data-only.
- The hosted Supabase project and its organization have not been selected. Database deployment and live authentication remain blocked until that account decision is complete.
- Disabling Confirm Email increases account-abuse and mistyped-address risk. The exception must remain preview-only, with signup rate limits and no real data.
- Password reset still depends on hosted email delivery even while signup confirmation is disabled.
- The first full browser run contained one non-reproducing import timeout. The full rerun passed, but deployment verification must retain the import smoke test.

## Rejected alternatives

### AWS Amplify Hosting

Reject Amplify because its official managed SSR support does not include the installed Next.js 16.3.5 release. A downgrade would violate the deployment constraints and is not technically necessary.

### AWS App Runner

Reject App Runner because AWS no longer opens it to new customers, the current AWS account context is unavailable, and an available service retains a provisioned-instance memory charge instead of scaling automatically to zero.

### Amazon ECS on Fargate

Reject ECS on Fargate because it adds a load balancer, networking, IAM, registry, task, service, and logging resources for no compatibility benefit. Its idle cost and cleanup surface exceed the Container Apps design.

## Assumptions

- West Europe is acceptable for the preview application resources.
- A separate non-production Supabase project is available on a free or already approved plan.
- Preview users enter fictional data only.
- One replica, 0.5 vCPU, and 1 GiB memory are sufficient for the bounded preview workload; live verification must confirm this assumption.
- No custom domain, custom network, premium registry, paid image scanner, or production monitoring package is required.
- The selected subscription permits creation of the listed resources and role assignment at registry scope.

## Final recommendation

Deploy the preview to Azure Container Apps in West Europe after the required cost confirmation and hosted Supabase account selection. Use the standard standalone Next.js container, private ACR, managed identity, exact HTTPS callback URLs, zero minimum replicas, one maximum replica, and a 30-day log workspace.

Do not deploy to AWS, downgrade Next.js, use real financial data, or describe the preview as production-ready.
