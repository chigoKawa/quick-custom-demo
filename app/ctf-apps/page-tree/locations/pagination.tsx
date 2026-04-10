"use client";

import { useCallback, useMemo } from "react";
import styles from "./pagination.module.css";

export const DEFAULT_PAGE_SIZE = 50;
export const PAGE_SIZE_OPTIONS = [25, 50, 100] as const;

interface PaginationProps {
  totalItems: number;
  pageSize: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

function buildPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];

  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("ellipsis");

  pages.push(total);
  return pages;
}

export default function Pagination({
  totalItems,
  pageSize,
  currentPage,
  onPageChange,
  onPageSizeChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const startItem = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endItem = Math.min(safePage * pageSize, totalItems);

  const pages = useMemo(() => buildPageNumbers(safePage, totalPages), [safePage, totalPages]);

  const handlePrev = useCallback(() => {
    if (safePage > 1) onPageChange(safePage - 1);
  }, [safePage, onPageChange]);

  const handleNext = useCallback(() => {
    if (safePage < totalPages) onPageChange(safePage + 1);
  }, [safePage, totalPages, onPageChange]);

  if (totalItems <= Math.min(...PAGE_SIZE_OPTIONS)) return null;

  return (
    <div className={styles.container}>
      <div className={styles.info}>
        Showing {startItem}–{endItem} of {totalItems}
      </div>

      <div className={styles.controls}>
        <button
          className={styles.navBtn}
          onClick={handlePrev}
          disabled={safePage <= 1}
        >
          ‹ Prev
        </button>

        {pages.map((p, i) =>
          p === "ellipsis" ? (
            <span key={`e${i}`} className={styles.ellipsis}>…</span>
          ) : (
            <button
              key={p}
              className={`${styles.pageBtn} ${p === safePage ? styles.pageBtnActive : ""}`}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          )
        )}

        <button
          className={styles.navBtn}
          onClick={handleNext}
          disabled={safePage >= totalPages}
        >
          Next ›
        </button>
      </div>

      <div className={styles.sizeSelector}>
        <label className={styles.sizeLabel}>Per page</label>
        <select
          className={styles.sizeSelect}
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
        >
          {PAGE_SIZE_OPTIONS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
