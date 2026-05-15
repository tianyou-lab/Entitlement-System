#pragma once

#include <map>
#include <string>

namespace entitlement {

struct DeviceInfo {
  std::string deviceCode;
  std::string fingerprintHash;
  std::string deviceName;
  std::string osType;
  std::string osVersion;
  std::string appVersion;
};

struct LicenseResponse {
  bool ok = false;
  int httpStatus = 0;
  std::string code;
  std::string message;
  std::string body;
  std::string leaseToken;
};

class LicenseClient {
 public:
  LicenseClient(std::string apiBaseUrl, std::string productCode);
  LicenseClient(std::string apiBaseUrl, std::string productCode, std::string requestSigningSecret);

  LicenseResponse activate(const std::string& licenseKey, const DeviceInfo& device) const;
  LicenseResponse verify(const std::string& leaseToken, const std::string& deviceCode, const std::string& appVersion) const;
  LicenseResponse heartbeat(const std::string& leaseToken, const std::string& deviceCode, const std::string& appVersion) const;
  LicenseResponse deactivate(const std::string& licenseKey, const std::string& deviceCode) const;
  LicenseResponse versionPolicy() const;

 private:
  std::string apiBaseUrl_;
  std::string productCode_;
  std::string requestSigningSecret_;

  LicenseResponse post(const std::string& path, const std::string& body) const;
  LicenseResponse get(const std::string& path) const;
  std::string signatureHeaders(const std::string& method, const std::string& path, const std::string& body) const;
};

std::string jsonEscape(const std::string& value);
std::string extractJsonString(const std::string& body, const std::string& key);
std::string hmacSha256Base64Url(const std::string& secret, const std::string& payload);

}  // namespace entitlement
