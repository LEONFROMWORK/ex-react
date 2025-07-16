#!/bin/bash

echo "🧹 Removing unused packages..."

# Remove unused Radix UI components
npm uninstall \
  @radix-ui/react-radio-group \
  @radix-ui/react-separator \
  @radix-ui/react-slider \
  @radix-ui/react-menubar \
  @radix-ui/react-navigation-menu \
  @radix-ui/react-context-menu \
  @radix-ui/react-alert-dialog \
  @radix-ui/react-popover \
  @radix-ui/react-tooltip \
  @radix-ui/react-progress \
  @radix-ui/react-select \
  @radix-ui/react-switch \
  @radix-ui/react-scroll-area

# Remove unused features
npm uninstall \
  @uploadthing/react \
  uploadthing \
  jose \
  cmdk \
  react-day-picker \
  @tanstack/react-table \
  @tosspayments/tosspayments-sdk

# Remove duplicate Excel libraries
npm uninstall xlsx hyperformula

# Remove unused AI SDKs
npm uninstall @google/generative-ai openai

# Remove duplicate HTTP client
npm uninstall axios

# Remove unused cloud storage
npm uninstall @azure/storage-blob

echo "✅ Cleanup complete!"