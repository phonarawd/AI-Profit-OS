import { ProfitsDesktopClient } from "../ProfitsDesktopClient";
import "../../components/spark-dash-home/spark-dash-home.css";

/**
 * REL-106 /profits — one route, one feed truth, responsive presentation.
 * Fixture는 /dev/spark-dash-profits 만.
 */
export default function Page() {
  return <ProfitsDesktopClient />;
}
