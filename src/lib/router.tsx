import {
  Link as RouterLink,
  useLocation,
  useNavigate,
} from "react-router-dom";
import type { ComponentProps } from "react";

type LinkProps = Omit<ComponentProps<typeof RouterLink>, "to"> & {
  href: string;
};

export function Link({ href, ...props }: LinkProps) {
  return <RouterLink to={href} {...props} />;
}

export function usePathname() {
  return useLocation().pathname;
}

export function useRouter() {
  const navigate = useNavigate();

  return {
    back: () => navigate(-1),
    push: (to: string) => navigate(to),
    refresh: () => window.location.reload(),
    replace: (to: string) => navigate(to, { replace: true }),
  };
}
