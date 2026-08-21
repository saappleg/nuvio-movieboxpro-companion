#!/usr/bin/env bash
_cs_boot="${COMMUNITY_SCRIPTS_CORE_DIR:-$(dirname "${BASH_SOURCE[0]}")/../../core}/core/build.func"
source "$_cs_boot" 2>/dev/null || source <(curl -fsSL "${COMMUNITY_SCRIPTS_CORE_URL:-https://raw.githubusercontent.com/community-scripts/core/main}/core/build.func")
# Copyright (c) 2026 Steven
# License: MIT | https://github.com/saappleg/nuvio-movieboxpro-companion/blob/main/LICENSE
# Source: https://github.com/saappleg/nuvio-movieboxpro-companion

APP="NuvioMovieBoxProCompanion"
var_tags="${var_tags:-media;streaming}"
var_cpu="${var_cpu:-2}"
var_ram="${var_ram:-4096}"
var_disk="${var_disk:-16}"
var_os="${var_os:-debian}"
var_version="${var_version:-13}"
var_arm64="${var_arm64:-yes}"
var_unprivileged="${var_unprivileged:-1}"

header_info "$APP"
variables
color
catch_errors

function update_script() {
  header_info
  check_container_storage
  check_container_resources

  if [[ ! -d /opt/nuvio-movieboxpro-companion ]]; then
    msg_error "No ${APP} installation found!"
    exit 1
  fi

  if check_for_gh_release "nuvio-movieboxpro-companion" "saappleg/nuvio-movieboxpro-companion" "" "" "true"; then
    msg_info "Stopping Companion Services"
    systemctl stop nuvio-companion nuvio-novnc nuvio-vnc nuvio-window-manager nuvio-display
    msg_ok "Stopped Companion Services"

    CLEAN_INSTALL=1 fetch_and_deploy_gh_release "nuvio-movieboxpro-companion" "saappleg/nuvio-movieboxpro-companion" "tarball" "${CHECK_UPDATE_RELEASE:-latest}"

    msg_info "Installing Application Dependencies"
    cd /opt/nuvio-movieboxpro-companion
    $STD npm ci --omit=dev
    PLAYWRIGHT_BROWSERS_PATH=/opt/ms-playwright $STD npx playwright install --with-deps chromium
    chmod 0755 scripts/nuvio-companion
    ln -sf /opt/nuvio-movieboxpro-companion/scripts/nuvio-companion /usr/local/bin/nuvio-companion
    msg_ok "Installed Application Dependencies"

    systemctl daemon-reload
    systemctl start nuvio-display nuvio-window-manager nuvio-vnc nuvio-novnc nuvio-companion
    msg_ok "Updated successfully!"
  fi
  exit
}

start
build_container
description

msg_ok "Completed Successfully!\n"
echo -e "${CREATING}${GN}${APP} has been installed.${CL}"
echo -e "${INFO}${YW}Dashboard:${CL} ${BGN}http://${IP}:43110${CL}"
echo -e "${INFO}${YW}Browser desktop:${CL} ${BGN}http://${IP}:6080/vnc.html${CL}"
echo -e "${INFO}${YW}Run 'nuvio-companion setup-url' in the LXC console for the private setup link.${CL}"
