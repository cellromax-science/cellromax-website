"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/Tabs";
import { ConsumerForm } from "./ConsumerForm";
import { PharmacistForm } from "./PharmacistForm";
import { BusinessForm } from "./BusinessForm";
import type { InquiryType } from "@/types/contact";

const INQUIRY_TABS: InquiryType[] = ["consumer", "pharmacist", "business"];

export function ContactPage() {
  const [activeTab, setActiveTab] = useState<string>("consumer");
  const t = useTranslations("contact");

  return (
    <Tabs value={activeTab} onChange={setActiveTab} variant="pill">
      <TabList className="justify-center mb-8">
        {INQUIRY_TABS.map((tab) => (
          <Tab key={tab} value={tab}>
            {t(`tabs.${tab}`)}
          </Tab>
        ))}
      </TabList>

      <TabPanel value="consumer">
        <ConsumerForm />
      </TabPanel>
      <TabPanel value="pharmacist">
        <PharmacistForm />
      </TabPanel>
      <TabPanel value="business">
        <BusinessForm />
      </TabPanel>
    </Tabs>
  );
}
