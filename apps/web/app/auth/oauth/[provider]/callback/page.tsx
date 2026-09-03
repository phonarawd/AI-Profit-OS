import { OauthCallbackRuntime } from "./OauthCallbackRuntime";

export default async function OauthCallbackPage({
  params,
}: {
  params: Promise<{ provider: string }>;
}) {
  const { provider } = await params;
  return <OauthCallbackRuntime provider={provider} />;
}
