FROM node:8

#RUN useradd -m node && usermod -u 600 node

#Update stretch repositories
RUN sed -i s/deb.debian.org/archive.debian.org/g /etc/apt/sources.list \
 && sed -i 's|security.debian.org|archive.debian.org/|g' /etc/apt/sources.list \
 && sed -i '/stretch-updates/d' /etc/apt/sources.list \
 && apt-get update \
 # for https
 && apt-get install -yyq ca-certificates \
 # Chromium recs
 && apt-get install -yyq fonts-liberation libgl1-mesa-dri chromium-l10n \
 # fonts ? NEEDED
 && apt-get install -yyq fonts-ipafont-gothic fonts-wqy-zenhei fonts-thai-tlwg fonts-kacst fonts-freefont-ttf \
 # Chromium deps NEEDED
 && apt-get install -yyq libasound2 libatk1.0-0 libatomic1 libatspi2.0-0 libavcodec57 libavformat57 libavutil55 libc6 libcairo2 libcups2 libdbus-1-3 libdrm2 libevent-2.0-5 libexpat1 libflac8 libfontconfig1 libfreetype6 libgcc1 libgdk-pixbuf2.0-0 libglib2.0-0 libgtk2.0-0 libicu57 libjpeg62-turbo libminizip1 libnspr4 libnss3 libopenjp2-7 libopus0 libpango-1.0-0 libpangocairo-1.0-0 libpangoft2-1.0-0 libpci3 libpng16-16 libpulse0 libre2-3 libsnappy1v5 libstdc++6 libvpx4 libwebp6 libwebpdemux2  libwebpmux2 libx11-6 libx11-xcb1 libxcb1 libxcomposite1 libxcursor1 libxdamage1 libxext6 libxfixes3 libxi6 libxml2 libxrandr2 libxrender1 libxslt1.1 libxss1 libxtst6 x11-utils xdg-utils zlib1g \
 # tools NEEDED
 && apt-get install -yyq lsb-release wget gconf-service libatk-bridge2.0-0 libgconf-2-4 libgtk-3-0 libappindicator1 vim mc jq \
 && chown node:node -R /usr/local/lib/node_modules/ \
 && chown node:node -R /usr/local/bin/  \
 # https://github.com/puppeteer/puppeteer/issues/3451#issuecomment-523961368
 && echo 'kernel.unprivileged_userns_clone=1' > /etc/sysctl.d/userns.conf \
 && mkdir -p /usr/src/screenshoteer \
 && rm -rf /var/lib/apt/lists/*
 
WORKDIR /usr/src/screenshoteer

COPY package.json .

RUN cd /usr/src/screenshoteer && npm install

#RUN wget https://github.com/Yelp/dumb-init/releases/download/v1.2.2/dumb-init_1.2.2_amd64.deb && \
#    dpkg -i dumb-init_*.deb

COPY . .

RUN chmod +x node_modules/screenshoteer/docker-entrypoint.sh \
 && node_modules/screenshoteer/docker-entrypoint.sh

EXPOSE 3000
USER node

# VOLUME ["/usr/src/garie-plugin/ScreenVOL"]

CMD ["npm", "start"]
# CMD ["/usr/bin/dumb-init", "npm", "start"]
