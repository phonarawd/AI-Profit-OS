import { GuestChrome } from "../../components/GuestChrome";
import { LoginRuntime } from "./LoginRuntime";

/** Canon auth-login */
export default function AuthLoginPage() {
  return (
    <GuestChrome>
      <LoginRuntime />
    </GuestChrome>
  );
}
