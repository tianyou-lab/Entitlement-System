#include "entitlement/license_client.hpp"

#include <cstdio>
#include <cstdlib>
#include <sstream>
#include <stdexcept>
#include <utility>

namespace entitlement {
namespace {

std::string shellQuote(const std::string& value) {
  std::string quoted = "'";
  for (char ch : value) {
    if (ch == '\'') quoted += "'\\''";
    else quoted += ch;
  }
  quoted += "'";
  return quoted;
}

LicenseResponse runCurl(const std::string& command) {
  FILE* pipe = popen(command.c_str(), "r");
  if (!pipe) throw std::runtime_error("failed to run curl");

  std::string output;
  char buffer[4096];
  while (fgets(buffer, sizeof(buffer), pipe)) output += buffer;
  const int rc = pclose(pipe);

  LicenseResponse response;
  const auto marker = output.rfind("\nHTTP_STATUS:");
  if (marker != std::string::npos) {
    response.body = output.substr(0, marker);
    response.httpStatus = std::atoi(output.substr(marker + 13).c_str());
  } else {
    response.body = output;
  }
  response.code = extractJsonString(response.body, "code");
  response.message = extractJsonString(response.body, "message");
  response.leaseToken = extractJsonString(response.body, "leaseToken");
  response.ok = rc == 0 && response.httpStatus >= 200 && response.httpStatus < 300 && response.code == "OK";
  return response;
}

}  // namespace

LicenseClient::LicenseClient(std::string apiBaseUrl, std::string productCode)
    : apiBaseUrl_(std::move(apiBaseUrl)), productCode_(std::move(productCode)) {
  while (!apiBaseUrl_.empty() && apiBaseUrl_.back() == '/') apiBaseUrl_.pop_back();
}

LicenseResponse LicenseClient::activate(const std::string& licenseKey, const DeviceInfo& device) const {
  std::ostringstream body;
  body << "{\"productCode\":\"" << jsonEscape(productCode_) << "\",\"licenseKey\":\"" << jsonEscape(licenseKey)
       << "\",\"device\":{\"deviceCode\":\"" << jsonEscape(device.deviceCode)
       << "\",\"fingerprintHash\":\"" << jsonEscape(device.fingerprintHash)
       << "\",\"deviceName\":\"" << jsonEscape(device.deviceName)
       << "\",\"osType\":\"" << jsonEscape(device.osType)
       << "\",\"osVersion\":\"" << jsonEscape(device.osVersion)
       << "\",\"appVersion\":\"" << jsonEscape(device.appVersion) << "\",\"hardwareSummary\":{}}}";
  return post("/api/v1/license/activate", body.str());
}

LicenseResponse LicenseClient::verify(const std::string& leaseToken, const std::string& deviceCode, const std::string& appVersion) const {
  std::ostringstream body;
  body << "{\"productCode\":\"" << jsonEscape(productCode_) << "\",\"leaseToken\":\"" << jsonEscape(leaseToken)
       << "\",\"deviceCode\":\"" << jsonEscape(deviceCode) << "\",\"appVersion\":\"" << jsonEscape(appVersion) << "\"}";
  return post("/api/v1/license/verify", body.str());
}

LicenseResponse LicenseClient::heartbeat(const std::string& leaseToken, const std::string& deviceCode, const std::string& appVersion) const {
  std::ostringstream body;
  body << "{\"productCode\":\"" << jsonEscape(productCode_) << "\",\"leaseToken\":\"" << jsonEscape(leaseToken)
       << "\",\"deviceCode\":\"" << jsonEscape(deviceCode) << "\",\"appVersion\":\"" << jsonEscape(appVersion) << "\",\"runtime\":{}}";
  return post("/api/v1/license/heartbeat", body.str());
}

LicenseResponse LicenseClient::deactivate(const std::string& licenseKey, const std::string& deviceCode) const {
  std::ostringstream body;
  body << "{\"productCode\":\"" << jsonEscape(productCode_) << "\",\"licenseKey\":\"" << jsonEscape(licenseKey)
       << "\",\"deviceCode\":\"" << jsonEscape(deviceCode) << "\"}";
  return post("/api/v1/license/deactivate", body.str());
}

LicenseResponse LicenseClient::versionPolicy() const {
  return get("/api/v1/version/policy?productCode=" + productCode_);
}

LicenseResponse LicenseClient::post(const std::string& path, const std::string& body) const {
  const std::string command = "curl -sS -X POST -H 'content-type: application/json' --data " + shellQuote(body) + " -w '\\nHTTP_STATUS:%{http_code}' " + shellQuote(apiBaseUrl_ + path);
  return runCurl(command);
}

LicenseResponse LicenseClient::get(const std::string& path) const {
  const std::string command = "curl -sS -w '\\nHTTP_STATUS:%{http_code}' " + shellQuote(apiBaseUrl_ + path);
  return runCurl(command);
}

std::string jsonEscape(const std::string& value) {
  std::string escaped;
  for (char ch : value) {
    switch (ch) {
      case '\\': escaped += "\\\\"; break;
      case '"': escaped += "\\\""; break;
      case '\n': escaped += "\\n"; break;
      case '\r': escaped += "\\r"; break;
      case '\t': escaped += "\\t"; break;
      default: escaped += ch;
    }
  }
  return escaped;
}

std::string extractJsonString(const std::string& body, const std::string& key) {
  const std::string needle = "\"" + key + "\":";
  const auto keyPos = body.find(needle);
  if (keyPos == std::string::npos) return "";
  auto valuePos = body.find('"', keyPos + needle.size());
  if (valuePos == std::string::npos) return "";
  ++valuePos;
  std::string value;
  bool escaped = false;
  for (auto i = valuePos; i < body.size(); ++i) {
    const char ch = body[i];
    if (escaped) {
      value += ch;
      escaped = false;
      continue;
    }
    if (ch == '\\') {
      escaped = true;
      continue;
    }
    if (ch == '"') break;
    value += ch;
  }
  return value;
}

}  // namespace entitlement
