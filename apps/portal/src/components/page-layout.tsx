import type { ReactNode } from "react";

interface PageLayoutProps {
  children: ReactNode;
  /** max-width constraint, defaults to 4xl (896px) */
  maxWidth?: "3xl" | "4xl" | "5xl" | "6xl" | "full";
}

const widthClasses = {
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  full: "max-w-full",
};

export const PageLayout = ({
  children,
  maxWidth = "4xl",
}: PageLayoutProps) => (
  <div className={`mx-auto w-full ${widthClasses[maxWidth]} space-y-6`}>
    {children}
  </div>
);
