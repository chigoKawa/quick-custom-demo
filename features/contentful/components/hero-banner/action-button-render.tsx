import React, { FC } from "react";
import { IBaseButton } from "../../type";
import BaseButtonWrapper from "../base-button/base-button-wrapper";
import type { MetricEventName } from "@/features/tracking/use-tracking";

interface IProps {
  buttons: IBaseButton[]; // Array of button objects with properties for rendering
  metricEventName?: MetricEventName; // Optional metric event to track on click
}

const ActionButtonRender: FC<IProps> = ({ buttons, metricEventName }) => {
  if (!Array.isArray(buttons) || buttons.length === 0) return null;

  return (
    <div className="flex flex-col md:flex-row gap-6 ">
      {buttons
        .filter((b): b is IBaseButton => Boolean(b?.sys?.id))
        .map((button, index) => (
          <BaseButtonWrapper
            key={`btn-${button.sys.id}-${index}`}
            {...button}
            metricEventName={metricEventName}
          />
        ))}
    </div>
  );
};

export default ActionButtonRender;
