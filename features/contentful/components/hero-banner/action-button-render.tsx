import React, { FC } from "react";
import { IBaseButton } from "../../type";
import BaseButtonWrapper from "../base-button/base-button-wrapper";
import type { MetricEventName } from "@/features/tracking/use-tracking";

interface IProps {
  buttons: IBaseButton[]; // Array of button objects with properties for rendering
  metricEventName?: MetricEventName; // Optional metric event to track on click
}

const ActionButtonRender: FC<IProps> = ({ buttons, metricEventName }) => {
  return (
    <div className="flex flex-col md:flex-row gap-6 ">
      {/* Loop through the buttons array and render each button using BaseButtonWrapper */}
      {buttons?.map((button, index) => (
        <BaseButtonWrapper key={`key-${index}`} {...button} metricEventName={metricEventName} />
      ))}
    </div>
  );
};

export default ActionButtonRender;
