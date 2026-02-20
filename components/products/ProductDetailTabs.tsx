"use client";

import { useState } from "react";
import { Tabs, TabList, Tab, TabPanel } from "@/components/ui/Tabs";

interface TabItem {
  key: string;
  label: string;
  content: string | null;
}

interface ProductDetailTabsProps {
  tabs: TabItem[];
}

export function ProductDetailTabs({ tabs }: ProductDetailTabsProps) {
  // null content인 탭 제외
  const visibleTabs = tabs.filter((tab) => tab.content !== null);

  const [activeTab, setActiveTab] = useState<string>(
    visibleTabs[0]?.key ?? ""
  );

  if (visibleTabs.length === 0) return null;

  return (
    <Tabs value={activeTab} onChange={setActiveTab} variant="underline">
      <TabList className="overflow-x-auto">
        {visibleTabs.map((tab) => (
          <Tab key={tab.key} value={tab.key}>
            {tab.label}
          </Tab>
        ))}
      </TabList>

      {visibleTabs.map((tab) => (
        <TabPanel key={tab.key} value={tab.key}>
          <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm md:text-base">
            {tab.content}
          </p>
        </TabPanel>
      ))}
    </Tabs>
  );
}
