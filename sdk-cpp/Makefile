CXX ?= g++
CXXFLAGS ?= -std=c++17 -Wall -Wextra -Wpedantic -O2
CPPFLAGS ?= -Iinclude

.PHONY: all demo clean

all: demo

demo: build/demo

build/demo: src/license_client.cpp demo/main.cpp include/entitlement/license_client.hpp
	mkdir -p build
	$(CXX) $(CPPFLAGS) $(CXXFLAGS) src/license_client.cpp demo/main.cpp -o $@

clean:
	rm -rf build
