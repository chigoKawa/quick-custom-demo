"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Home, ArrowLeft, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-6 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg w-full text-center"
      >
        {/* Icon */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="mx-auto mb-8 w-24 h-24 rounded-full bg-muted flex items-center justify-center"
        >
          <FileQuestion className="w-12 h-12 text-muted-foreground" />
        </motion.div>

        {/* 404 Text */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <h1 className="text-8xl font-bold text-primary/20 mb-2">404</h1>
          <h2 className="text-2xl font-semibold text-foreground mb-3">
            Page not found
          </h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            Sorry, we couldn&apos;t find the page you&apos;re looking for. It
            might have been moved, deleted, or never existed.
          </p>
        </motion.div>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex flex-wrap gap-3 justify-center"
        >
          <Button asChild size="lg">
            <Link href="/">
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="javascript:history.back()">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Go Back
            </Link>
          </Button>
        </motion.div>

        {/* Search suggestion */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-8 pt-8 border-t border-border"
        >
          <p className="text-sm text-muted-foreground mb-3">
            Try searching for what you need
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <kbd className="inline-flex h-6 items-center gap-1 rounded border border-border bg-muted px-2 font-mono text-xs">
              <span>⌘</span>K
            </kbd>
            <span>to open search</span>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
