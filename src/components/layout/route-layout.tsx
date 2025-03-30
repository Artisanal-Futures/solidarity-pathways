import CookieConsent from "../cookie-banner";
import { Navbar } from "./navbar";

const RouteLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <>
      <main className="fixed flex h-full w-full flex-col">
        <Navbar />
        <div className="relative flex h-full flex-col-reverse bg-slate-50 p-2 max-md:overflow-auto md:flex-row lg:h-[calc(100vh-64px)]">
          {children}
        </div>
        <CookieConsent />
      </main>
    </>
  );
};
export default RouteLayout;
