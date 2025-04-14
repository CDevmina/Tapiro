import {
  Footer as FlowbiteFooter, // Keep alias for the main container if preferred
  FooterBrand,
  FooterCopyright,
  FooterDivider,
  FooterIcon,
  FooterLink,
  FooterLinkGroup,
  FooterTitle,
} from "flowbite-react";
import { Link } from "react-router-dom";
import { BsGithub, BsTwitter, BsDribbble } from "react-icons/bs"; // Example icons

export function Footer() {
  return (
    <FlowbiteFooter container>
      <div className="w-full">
        <div className="grid w-full justify-between sm:flex sm:justify-between md:flex md:grid-cols-1">
          <div>
            {/* You can replace this with your logo */}
            <FooterBrand
              href="/"
              src="/vite.svg" // Using vite logo as placeholder
              alt="Tapiro Logo"
              name="Tapiro"
            />
          </div>
          <div className="grid grid-cols-2 gap-8 sm:mt-4 sm:grid-cols-3 sm:gap-6">
            <div>
              <FooterTitle title="About" />
              <FooterLinkGroup col>
                <FooterLink as={Link} href="/about">
                  About Tapiro
                </FooterLink>
                <FooterLink as={Link} href="/for-users">
                  For Users
                </FooterLink>
                <FooterLink as={Link} href="/for-stores">
                  For Stores
                </FooterLink>
              </FooterLinkGroup>
            </div>
            <div>
              <FooterTitle title="Resources" />
              <FooterLinkGroup col>
                <FooterLink as={Link} href="/api-docs">
                  API Documentation
                </FooterLink>
                <FooterLink
                  href="https://github.com/your-repo" // Keep href for external links
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  GitHub
                </FooterLink>
              </FooterLinkGroup>
            </div>
            <div>
              <FooterTitle title="Legal" />
              <FooterLinkGroup col>
                <FooterLink as={Link} href="/privacy">
                  Privacy Policy
                </FooterLink>
                <FooterLink as={Link} href="/terms">
                  Terms &amp; Conditions
                </FooterLink>
              </FooterLinkGroup>
            </div>
          </div>
        </div>
        <FooterDivider />
        <div className="w-full sm:flex sm:items-center sm:justify-between">
          <FooterCopyright
            href="/"
            by="Tapiro™"
            year={new Date().getFullYear()}
          />
          <div className="mt-4 flex space-x-6 sm:mt-0 sm:justify-center">
            {/* Add social media links if needed */}
            <FooterIcon href="#" icon={BsGithub} />
            <FooterIcon href="#" icon={BsTwitter} />
            <FooterIcon href="#" icon={BsDribbble} />
          </div>
        </div>
      </div>
    </FlowbiteFooter>
  );
}
