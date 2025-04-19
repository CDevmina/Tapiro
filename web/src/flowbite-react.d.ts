import "flowbite-react";

declare module "flowbite-react" {
  // augment the props so that `to` is allowed whenever you use `as={Link}`
  interface NavbarLinkProps {
    to?: string;
  }
  interface NavbarBrandProps {
    to?: string;
  }
}
