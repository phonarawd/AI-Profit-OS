import { AuthLogin } from "@aipo/ui/components/auth";
import { GuestChrome } from "../../components/GuestChrome";

/** Canon auth-login */
export default function AuthLoginPage() {
  return (
    <GuestChrome>
      <AuthLogin />
    </GuestChrome>
  );
}
