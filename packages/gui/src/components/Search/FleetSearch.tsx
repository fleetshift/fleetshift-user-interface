import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Menu,
  MenuContent,
  MenuGroup,
  MenuItem,
  MenuList,
  SearchInput,
} from "@patternfly/react-core";
import { Popper } from "@patternfly/react-core/dist/esm/helpers/Popper/Popper";
import {
  CogIcon,
  CubesIcon,
  SearchIcon,
  ServerIcon,
} from "@patternfly/react-icons";
import { useSearch } from "./SearchProvider";
import type { GroupedResults, SearchResultItem } from "./searchIndex";
import "./FleetSearch.scss";

const CATEGORY_LABELS: Record<string, string> = {
  nav: "Pages",
  cluster: "Clusters",
  action: "Actions",
  setting: "Settings",
};

const KNOWN_CATEGORIES = ["nav", "cluster", "action", "setting"];

const ICON_MAP: Record<string, React.ComponentType> = {
  CubesIcon,
  ServerIcon,
  CogIcon,
};

function ResultIcon({ name }: { name: string }) {
  const Icon = ICON_MAP[name] ?? SearchIcon;
  return <Icon />;
}

function HighlightedText({ html }: { html: string }) {
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

function totalCount(results: GroupedResults): number {
  let count = 0;
  for (const items of Object.values(results)) count += items.length;
  return count;
}

function categoryOrder(results: GroupedResults): string[] {
  const seen = new Set(KNOWN_CATEGORIES);
  const order = [...KNOWN_CATEGORIES];
  for (const key of Object.keys(results)) {
    if (!seen.has(key)) order.push(key);
  }
  return order;
}

interface FleetSearchProps {
  onStateChange?: (isOpen: boolean) => void;
}

const EMPTY: GroupedResults = {};

const FleetSearch = ({ onStateChange }: FleetSearchProps) => {
  const { query } = useSearch();
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [results, setResults] = useState<GroupedResults>(EMPTY);
  const toggleRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const blockCloseRef = useRef(false);

  const total = totalCount(results);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
    onStateChange?.(false);
  }, [onStateChange]);

  const clearSearch = useCallback(() => {
    setSearchValue("");
    setResults(EMPTY);
    closeMenu();
  }, [closeMenu]);

  const handleSelect = useCallback(
    (item: SearchResultItem) => {
      if (item.pathname.startsWith("#toggle-")) {
        const key = item.pathname === "#toggle-dark" ? "fleetshift_dark_mode" : "fleetshift_glass_mode";
        const current = localStorage.getItem(key) === "true";
        localStorage.setItem(key, String(!current));
        window.dispatchEvent(new Event("storage"));
      } else {
        navigate(item.pathname);
      }
      clearSearch();
    },
    [navigate, clearSearch],
  );

  const handleChange = useCallback(
    async (_e: unknown, value: string) => {
      setSearchValue(value);
      if (!value.trim()) {
        setResults(EMPTY);
        setIsOpen(false);
        onStateChange?.(false);
        return;
      }
      const r = await query(value);
      setResults(r);
      const hasResults = totalCount(r) > 0;
      setIsOpen(hasResults);
      onStateChange?.(hasResults);
    },
    [query, onStateChange],
  );

  const handleClear = useCallback(() => {
    setSearchValue("");
    setResults(EMPTY);
    setIsOpen(false);
    onStateChange?.(false);
  }, [onStateChange]);

  const handleInputClick = useCallback(() => {
    if (!isOpen && total > 0) {
      setIsOpen(true);
      onStateChange?.(true);
      blockCloseRef.current = true;
    }
  }, [isOpen, total, onStateChange]);

  const handleInputKeyDown = useCallback(
    (ev: React.KeyboardEvent) => {
      if (isOpen && ev.key === "ArrowDown" && menuRef.current) {
        ev.preventDefault();
        const first = menuRef.current.querySelector<HTMLElement>("li > button, li > a");
        first?.focus();
      } else if (isOpen && ev.key === "Escape") {
        closeMenu();
      }
    },
    [isOpen, closeMenu],
  );

  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (menuRef.current?.contains(e.target as Node) || toggleRef.current?.contains(e.target as Node)) {
        if (e.key === "Escape" || e.key === "Tab") {
          closeMenu();
          toggleRef.current?.focus();
        }
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (!blockCloseRef.current && isOpen && !menuRef.current?.contains(e.target as Node)) {
        closeMenu();
      }
      blockCloseRef.current = false;
    };

    window.addEventListener("keydown", handleKeys);
    window.addEventListener("click", handleClickOutside);
    return () => {
      window.removeEventListener("keydown", handleKeys);
      window.removeEventListener("click", handleClickOutside);
    };
  }, [isOpen, closeMenu]);

  useEffect(() => {
    const handleResize = () => {
      if (!menuRef.current) return;
      const { height: bodyHeight } = document.body.getBoundingClientRect();
      const { top } = menuRef.current.getBoundingClientRect();
      menuRef.current.style.maxHeight = `${bodyHeight - top - 4}px`;
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [isOpen, total]);

  const toggle = (
    <SearchInput
      placeholder="Search pages, clusters, settings..."
      value={searchValue}
      onChange={handleChange}
      onClear={handleClear}
      onClick={handleInputClick}
      onKeyDown={handleInputKeyDown}
      ref={toggleRef}
    />
  );

  const menu = (
    <Menu ref={menuRef} className="fs-search__menu">
      <MenuContent>
        <MenuList>
          {categoryOrder(results).map((cat) => {
            const items = results[cat];
            if (!items || items.length === 0) return null;
            return (
              <MenuGroup key={cat} label={CATEGORY_LABELS[cat] ?? cat}>
                {items.map((item) => {
                  if (item.Component) {
                    return (
                      <li key={item.id} role="none" onClick={clearSearch}>
                        <item.Component
                          title={item.title}
                          description={item.description}
                        />
                      </li>
                    );
                  }
                  const isToggle = item.pathname.startsWith("#toggle-");
                  return (
                    <MenuItem
                      key={item.id}
                      icon={<ResultIcon name={item.icon} />}
                      description={
                        item.description ? <HighlightedText html={item.description} /> : undefined
                      }
                      {...(isToggle
                        ? { onClick: () => handleSelect(item) }
                        : {
                            component: (props: React.HTMLAttributes<HTMLAnchorElement>) => (
                              <Link to={item.pathname} {...props} />
                            ),
                            onClick: clearSearch,
                          })}
                    >
                      <HighlightedText html={item.title} />
                      {item.status && (
                        <span className={`fs-search__status fs-search__status--${item.status}`}>
                          {item.status}
                        </span>
                      )}
                    </MenuItem>
                  );
                })}
              </MenuGroup>
            );
          })}
          {total === 0 && searchValue && (
            <MenuItem isDisabled>No results found</MenuItem>
          )}
        </MenuList>
      </MenuContent>
    </Menu>
  );

  return (
    <div ref={containerRef} className="fs-search">
      <Popper
        trigger={toggle}
        popper={menu}
        appendTo={containerRef.current || undefined}
        isVisible={isOpen}
      />
    </div>
  );
};

export default FleetSearch;
