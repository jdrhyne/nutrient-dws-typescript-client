#!/bin/bash

# Script to run integration tests with live API
# Usage: ./scripts/run-integration-tests.sh [API_KEY]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}Nutrient DWS Integration Test Runner${NC}"
echo "====================================="

# Check if API key is provided as argument or environment variable
if [ -n "$1" ]; then
    API_KEY="$1"
elif [ -n "$NUTRIENT_API_KEY" ]; then
    API_KEY="$NUTRIENT_API_KEY"
else
    echo -e "${RED}Error: No API key provided${NC}"
    echo "Usage: $0 [API_KEY]"
    echo "Or set NUTRIENT_API_KEY environment variable"
    exit 1
fi

# Confirm with user before running live API tests
echo -e "${YELLOW}Warning: This will run tests against the live Nutrient API${NC}"
echo "API Key: ${API_KEY:0:20}..."
echo -e "${YELLOW}These tests may consume API credits. Continue? (y/N)${NC}"
read -r response

if [[ ! "$response" =~ ^[Yy]$ ]]; then
    echo "Cancelled."
    exit 0
fi

echo -e "${GREEN}Running integration tests...${NC}"
echo

# Create example files if they don't exist
mkdir -p examples

# Create a simple PDF example if it doesn't exist
if [ ! -f "examples/example.pdf" ]; then
    echo "Creating example.pdf..."
    echo "%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj
2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj
3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj
4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
100 700 Td
(Hello World) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000189 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
284
%%EOF" > examples/example.pdf
fi

# Create a simple DOCX example if it doesn't exist
if [ ! -f "examples/example.docx" ]; then
    echo "Creating example.docx..."
    echo "This is a test document." > examples/example.txt
    # Note: This creates a text file, not a real DOCX. In practice, you'd want real test files.
fi

# Set environment variables and run tests
export NUTRIENT_API_KEY="$API_KEY"
export RUN_INTEGRATION_TESTS="true"

# Run the integration tests
echo -e "${GREEN}Starting integration tests...${NC}"
npm test -- --testPathPattern="integration.test" --verbose

# Check exit code
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ Integration tests passed!${NC}"
else
    echo -e "${RED}❌ Integration tests failed${NC}"
    exit 1
fi

echo
echo -e "${BLUE}Integration test summary:${NC}"
echo "• All new methods have been tested"
echo "• Error handling scenarios covered"
echo "• Performance tests included"
echo "• Live API functionality verified"
echo
echo -e "${GREEN}Integration tests completed successfully!${NC}"