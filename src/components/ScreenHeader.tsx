import type { ReactNode } from "react";
import { OverflowMenu, type OverflowMenuItem } from "./OverflowMenu";

type MainProps = {
  variant: "main";
  title: string;
  createLabel: string;
  onCreate: () => void;
  menuLabel: string;
  menuItems: OverflowMenuItem[];
};

type DetailProps = {
  variant: "detail";
  leading: ReactNode;
  trailing?: ReactNode;
};

type Props = MainProps | DetailProps;

export function ScreenHeader(props: Props) {
  if (props.variant === "detail") {
    return (
      <header className="screen-header screen-header--detail">
        <div className="screen-header__detail-row">
          {props.leading}
          {props.trailing ? <div className="screen-header__detail-actions">{props.trailing}</div> : null}
        </div>
      </header>
    );
  }

  return (
    <header className="screen-header screen-header--main">
      <div className="screen-header__top-row">
        <button type="button" className="btn-pill" onClick={props.onCreate}>
          {props.createLabel}
        </button>
        <OverflowMenu label={props.menuLabel} items={props.menuItems} />
      </div>
      <h1 className="screen-header__title">{props.title}</h1>
    </header>
  );
}
