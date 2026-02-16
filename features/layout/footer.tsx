"use client";

import LocaleSwitcher from "../locale-switching/locale-switcher";
import React, { useEffect, useState } from "react";
import { getLocales } from "@/lib/contentful";
import { getI18nConfig } from "@/i18n-config";
import {
  Facebook,
  Instagram,
  Twitter,
  Youtube,
  CreditCard,
  Truck,
  ShieldCheck,
  Headphones,
} from "lucide-react";
import type { Entry } from "contentful";
import type {
  SiteSettingsSkeleton,
  NavLinkSkeleton,
  NavLinkColumnSkeleton,
  FooterFeatureSkeleton,
  PaymentMethodSkeleton,
} from "@/lib/site-settings";
import { resolveNavLinkUrl, getAssetUrl, getIconName } from "@/lib/site-settings";
import { useContentfulInspectorMode, useContentfulLiveUpdates } from "@contentful/live-preview/react";

interface FooterProps {
  siteSettings: Entry<SiteSettingsSkeleton> | null;
}

// Icon component mapping
const iconComponents = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  truck: Truck,
  shield_check: ShieldCheck,
  headphones: Headphones,
  credit_card: CreditCard,
};

const Footer = ({ siteSettings }: FooterProps) => {
  const thisyear = new Date().getFullYear();
  const [localesData, setLocalesData] = useState<Array<{ code: string; name?: string; default?: boolean }>>([]);

  // Contentful Live Preview
  const liveSiteSettings = useContentfulLiveUpdates(siteSettings);
  const inspectorProps = useContentfulInspectorMode({
    entryId: liveSiteSettings?.sys.id
  });

  useEffect(() => {
    const loadLocales = async () => {
      try {
        const locales = await getLocales();
        setLocalesData(locales);
      } catch {
        const cfg = await getI18nConfig();
        setLocalesData(cfg.locales.map((code) => ({
          code,
          default: code === cfg.defaultLocale,
        })));
      }
    };
    loadLocales();
  }, []);

  // Extract data from site settings
  const logoUrl = liveSiteSettings ? getAssetUrl(liveSiteSettings.fields.logo) : null;
  const logoAlt = liveSiteSettings?.fields.logoAlt || "Logo";
  const footerFeatures = (liveSiteSettings?.fields.footerFeatures || []) as Entry<FooterFeatureSkeleton>[];
  const footerLinkColumns = (liveSiteSettings?.fields.footerLinkColumns || []) as Entry<NavLinkColumnSkeleton>[];
  const footerSocialLinks = (liveSiteSettings?.fields.footerSocialLinks || []) as Entry<NavLinkSkeleton>[];
  const footerPaymentMethods = (liveSiteSettings?.fields.footerPaymentMethods || []) as Entry<PaymentMethodSkeleton>[];
  const footerLegalText = liveSiteSettings?.fields.footerLegalText || `© ${thisyear} All rights reserved.`;

  return (
    <footer className="bg-foreground text-background">
      {/* Features bar */}
      {footerFeatures.length > 0 && (
        <div className="border-b border-background/10">
          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {footerFeatures.map((featureEntry, idx) => {
                const feature = featureEntry.fields;
                const iconName = getIconName(feature.icon);
                const IconComponent = iconName ? iconComponents[iconName as keyof typeof iconComponents] : Truck;

                return (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center flex-shrink-0">
                      {IconComponent && <IconComponent className="h-4 w-4" />}
                    </div>
                    <div
                      data-contentful-entry-id={featureEntry.sys.id}
                      data-contentful-field-id="title"
                    >
                      <p className="text-sm font-medium">{feature.title}</p>
                      {feature.description && (
                        <p
                          className="text-xs text-background/60"
                          data-contentful-entry-id={featureEntry.sys.id}
                          data-contentful-field-id="description"
                        >
                          {feature.description}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Logo and social links */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={logoAlt}
                  width={100}
                  height={100}
                  className="max-h-16 w-auto"
                  data-contentful-entry-id={liveSiteSettings?.sys.id}
                  data-contentful-field-id="logo"
                />
              ) : (
                <div
                  className="w-10 h-10 bg-background rounded-full flex items-center justify-center"
                  data-contentful-entry-id={liveSiteSettings?.sys.id}
                  data-contentful-field-id="logoAlt"
                >
                  <span className="text-foreground font-bold text-lg">
                    {logoAlt.substring(0, 3).toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Social links */}
            {footerSocialLinks.length > 0 && (
              <div className="flex gap-3">
                {footerSocialLinks.map((linkEntry, idx) => {
                  const link = linkEntry.fields;
                  const href = resolveNavLinkUrl(linkEntry);
                  const iconName = getIconName(link.icon);
                  const IconComponent = iconName ? iconComponents[iconName as keyof typeof iconComponents] : null;

                  return (
                    <a
                      key={idx}
                      href={href}
                      target={link.openInNewTab ? "_blank" : undefined}
                      rel={link.rel || (link.openInNewTab ? "noopener noreferrer" : undefined)}
                      className="w-8 h-8 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
                      data-contentful-entry-id={linkEntry.sys.id}
                      data-contentful-field-id="label"
                    >
                      {IconComponent && <IconComponent className="h-4 w-4" />}
                    </a>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer link columns */}
          {footerLinkColumns.map((columnEntry, idx) => {
            const column = columnEntry.fields;
            const links = (column.links || []) as Entry<NavLinkSkeleton>[];

            return (
              <div key={idx}>
                <h4
                  className="font-medium mb-4"
                  data-contentful-entry-id={columnEntry.sys.id}
                  data-contentful-field-id="title"
                >
                  {column.title}
                </h4>
                <ul className="space-y-2">
                  {links.map((linkEntry, linkIdx) => {
                    const link = linkEntry.fields;
                    const href = resolveNavLinkUrl(linkEntry);

                    return (
                      <li key={linkIdx}>
                        <a
                          href={href}
                          target={link.openInNewTab ? "_blank" : undefined}
                          rel={link.rel}
                          className="text-sm text-background/60 hover:text-background transition-colors"
                          data-contentful-entry-id={linkEntry.sys.id}
                          data-contentful-field-id="label"
                        >
                          {link.label}
                        </a>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>

        {/* Bottom bar with legal text, locale switcher, and payment methods */}
        <div className="mt-12 pt-8 border-t border-background/10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p
            className="text-sm text-background/60"
            data-contentful-entry-id={liveSiteSettings?.sys.id}
            data-contentful-field-id="footerLegalText"
          >
            {footerLegalText}
          </p>

          <div className="flex items-center gap-4">
            <div className="min-w-[180px]">
              <LocaleSwitcher localesData={localesData} />
            </div>

            {/* Payment methods */}
            <div className="flex gap-2">
              {footerPaymentMethods.map((paymentEntry, idx) => {
                const payment = paymentEntry.fields;
                const iconUrl = getAssetUrl(payment.icon);

                return (
                  <div
                    key={idx}
                    className="h-6 opacity-60"
                    data-contentful-entry-id={paymentEntry.sys.id}
                    data-contentful-field-id="label"
                  >
                    {iconUrl ? (
                      <img src={iconUrl} alt={payment.label} className="h-full w-auto" />
                    ) : (
                      <span className="text-xs">{payment.label}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
