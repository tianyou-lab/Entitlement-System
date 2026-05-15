#include <iostream>
#include <cstdlib>

#include "entitlement/license_client.hpp"

int main(int argc, char** argv) {
  const std::string apiBaseUrl = argc > 1 ? argv[1] : "http://127.0.0.1:3000";
  const std::string licenseKey = argc > 2 ? argv[2] : "DEMO-AAAA-BBBB-CCCC";
  const char* signingSecret = std::getenv("ENTITLEMENT_REQUEST_SIGNING_SECRET");
  if (!signingSecret) signingSecret = std::getenv("LICENSE_REQUEST_SIGNING_SECRET");

  entitlement::LicenseClient client(apiBaseUrl, "demo_app", signingSecret ? signingSecret : "");
  entitlement::DeviceInfo device{
      "cpp-demo-device",
      "cpp-demo-fingerprint",
      "C++ Demo",
      "linux",
      "unknown",
      "1.0.0",
  };

  const auto activation = client.activate(licenseKey, device);
  std::cout << "activate: " << activation.code << " " << activation.message << "\n";
  if (!activation.ok) {
    std::cerr << activation.body << "\n";
    return 1;
  }

  const auto verify = client.verify(activation.leaseToken, device.deviceCode, device.appVersion);
  std::cout << "verify: " << verify.code << " " << verify.message << "\n";
  if (!verify.ok) return 1;

  const auto heartbeat = client.heartbeat(activation.leaseToken, device.deviceCode, device.appVersion);
  std::cout << "heartbeat: " << heartbeat.code << " " << heartbeat.message << "\n";
  if (!heartbeat.ok) return 1;

  const auto deactivation = client.deactivate(licenseKey, device.deviceCode);
  std::cout << "deactivate: " << deactivation.code << " " << deactivation.message << "\n";
  return deactivation.ok ? 0 : 1;
}
