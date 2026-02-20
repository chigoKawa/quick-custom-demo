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
  type LucideIcon,
} from "lucide-react";
import type { Entry, Asset } from "contentful";
import type { SiteSettingsSkeleton } from "@/lib/site-settings";
import { resolveNavLinkUrl, getAssetUrl, getIconName } from "@/lib/site-settings";
import { useContentfulInspectorMode, useContentfulLiveUpdates } from "@contentful/live-preview/react";

interface FooterProps {
  siteSettings: Entry<SiteSettingsSkeleton> | null;
}

// Icon component mapping
const iconComponents: Record<string, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  twitter: Twitter,
  youtube: Youtube,
  truck: Truck,
  shield_check: ShieldCheck,
  headphones: Headphones,
  credit_card: CreditCard,
};

// Safe field accessor for Contentful entries (handles localized vs resolved fields)
function getField<T>(entry: any, fieldName: string, fallback: T): T {
  if (!entry?.fields) return fallback;
  const value = entry.fields[fieldName];
  if (value === undefined || value === null) return fallback;
  // If it's a localized object, try to get the first value
  if (typeof value === 'object' && !Array.isArray(value) && !('sys' in value)) {
    const keys = Object.keys(value);
    if (keys.length > 0) return value[keys[0]] as T;
  }
  return value as T;
}

function getFieldArray<T>(entry: any, fieldName: string): T[] {
  const value = getField(entry, fieldName, []);
  return Array.isArray(value) ? value : [];
}

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

  // Extract data from site settings with safe accessors
  const logoAsset = getField<Asset | null>(liveSiteSettings, 'logo', null);
  const logoUrl = logoAsset ? getAssetUrl(logoAsset) : null;
  const logoAlt = getField(liveSiteSettings, 'logoAlt', 'Logo');
  const footerFeatures = getFieldArray<Entry<any>>(liveSiteSettings, 'footerFeatures');
  const footerLinkColumns = getFieldArray<Entry<any>>(liveSiteSettings, 'footerLinkColumns');
  const footerSocialLinks = getFieldArray<Entry<any>>(liveSiteSettings, 'footerSocialLinks');
  const footerPaymentMethods = getFieldArray<Entry<any>>(liveSiteSettings, 'footerPaymentMethods');
  const footerLegalText = getField(liveSiteSettings, 'footerLegalText', `© ${thisyear} All rights reserved.`);

  return (
    <footer className="bg-foreground text-background">
      {/* Features bar */}
      {footerFeatures.length > 0 && (
        <div className="border-b border-background/10">
          <div className="container mx-auto px-4 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {footerFeatures.map((featureEntry, idx) => {
                const title = getField(featureEntry, 'title', '');
                const description = getField(featureEntry, 'description', '');
                const iconKey = getField(featureEntry, 'icon', '');
                const iconName = getIconName(iconKey);
                const IconComponent = iconName ? iconComponents[iconName] : Truck;

                return (
                  <div key={featureEntry.sys?.id || idx} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center flex-shrink-0">
                      {IconComponent && <IconComponent className="h-4 w-4" />}
                    </div>
                    <div
                      data-contentful-entry-id={featureEntry.sys?.id}
                      data-contentful-field-id="title"
                    >
                      <p className="text-sm font-medium">{title}</p>
                      {description && (
                        <p
                          className="text-xs text-background/60"
                          data-contentful-entry-id={featureEntry.sys?.id}
                          data-contentful-field-id="description"
                        >
                          {description}
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
                  const href = resolveNavLinkUrl(linkEntry);
                  const iconKey = getField(linkEntry, 'icon', '');
                  const openInNewTab = getField(linkEntry, 'openInNewTab', false);
                  const rel = getField(linkEntry, 'rel', '');
                  const iconName = getIconName(iconKey);
                  const IconComponent = iconName ? iconComponents[iconName] : null;

                  return (
                    <a
                      key={linkEntry.sys?.id || idx}
                      href={href}
                      target={openInNewTab ? "_blank" : undefined}
                      rel={rel || (openInNewTab ? "noopener noreferrer" : undefined)}
                      className="w-8 h-8 rounded-full bg-background/10 flex items-center justify-center hover:bg-background/20 transition-colors"
                      data-contentful-entry-id={linkEntry.sys?.id}
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
            const title = getField(columnEntry, 'title', '');
            const links = getFieldArray<Entry<any>>(columnEntry, 'links');

            return (
              <div key={columnEntry.sys?.id || idx}>
                <h4
                  className="font-medium mb-4"
                  data-contentful-entry-id={columnEntry.sys?.id}
                  data-contentful-field-id="title"
                >
                  {title}
                </h4>
                <ul className="space-y-2">
                  {links.map((linkEntry, linkIdx) => {
                    const label = getField(linkEntry, 'label', '');
                    const openInNewTab = getField(linkEntry, 'openInNewTab', false);
                    const rel = getField(linkEntry, 'rel', '');
                    const href = resolveNavLinkUrl(linkEntry);

                    return (
                      <li key={linkEntry.sys?.id || linkIdx}>
                        <a
                          href={href}
                          target={openInNewTab ? "_blank" : undefined}
                          rel={rel || undefined}
                          className="text-sm text-background/60 hover:text-background transition-colors"
                          data-contentful-entry-id={linkEntry.sys?.id}
                          data-contentful-field-id="label"
                        >
                          {label}
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
            {footerPaymentMethods.length > 0 && (
              <div className="flex gap-2">
                {footerPaymentMethods.map((paymentEntry, idx) => {
                  const label = getField(paymentEntry, 'label', '');
                  const iconAsset = getField<Asset | null>(paymentEntry, 'icon', null);
                  const iconUrl = iconAsset ? getAssetUrl(iconAsset) : null;

                  return (
                    <div
                      key={paymentEntry.sys?.id || idx}
                      className="h-6 opacity-60"
                      data-contentful-entry-id={paymentEntry.sys?.id}
                      data-contentful-field-id="label"
                    >
                      {iconUrl ? (
                        <img src={iconUrl} alt={label} className="h-full w-auto" />
                      ) : (
                        <span className="text-xs">{label}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
