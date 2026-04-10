"use client";

import styles from "./skeleton.module.css";

function TreeSkeletonRow({ indent }: { indent?: 0 | 1 | 2 }) {
  const cls = [
    styles.treeRow,
    indent === 1 ? styles.indent1 : indent === 2 ? styles.indent2 : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls}>
      <span className={styles.toggle} />
      <span className={styles.badge} />
      <span className={styles.dot} />
      <span className={styles.title} style={{ maxWidth: indent ? 160 : 220 }} />
      <span className={styles.path} />
    </div>
  );
}

export function TreeSkeleton({ rows = 8 }: { rows?: number }) {
  const pattern: (0 | 1 | 2)[] = [0, 1, 1, 2, 2, 1, 0, 1];
  return (
    <div>
      {Array.from({ length: rows }, (_, i) => (
        <TreeSkeletonRow key={i} indent={pattern[i % pattern.length]} />
      ))}
    </div>
  );
}

function TableSkeletonRow({ indent }: { indent?: 0 | 1 | 2 }) {
  return (
    <div
      className={styles.tableRow}
      style={{ paddingLeft: (indent ?? 0) * 24 + 16 }}
    >
      <span className={styles.handle} />
      <span className={styles.toggle} />
      <span className={styles.badge} />
      <span className={styles.tableTitle} />
      <span className={styles.tablePath} />
      <span className={styles.tableStatus} />
      <span className={styles.tableType} />
    </div>
  );
}

export function TableSkeleton({ rows = 10 }: { rows?: number }) {
  const pattern: (0 | 1 | 2)[] = [0, 1, 1, 2, 2, 1, 0, 1, 1, 0];
  return (
    <div>
      {Array.from({ length: rows }, (_, i) => (
        <TableSkeletonRow key={i} indent={pattern[i % pattern.length]} />
      ))}
    </div>
  );
}

export function StatsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className={styles.statsRow}>
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={styles.statCard}>
          <div className={styles.statValue} />
          <div className={styles.statLabel} />
        </div>
      ))}
    </div>
  );
}
