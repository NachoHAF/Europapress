const got = require('@/utils/got');
const cheerio = require('cheerio');
const { parseDate } = require('@/utils/parse-date');

module.exports = async (ctx) => {
    const category = ctx.params.category || '';

    const rootUrl = 'https://www.europapress.es';
    const currentUrl = `${rootUrl}${category ? `/${category}` : ''}`;

    const response = await got({
        method: 'get',
        url: currentUrl,
    });

    const $ = cheerio.load(response.data);

    const list = $('.articulo-titulo, .c-item__title, .home-articulo-titulo')
        .find('a')
        .map((_, item) => {
            item = $(item);

            return {
                title: item.text(),
                link: item.attr('href'),
            };
        })
        .get();

 const list2 = $('.CajaFullNoticias-item, .CajaDestacadoNoticias-item')
        .find('a')
        .map((_, item) => {
            item = $(item);

            return {
                title: item.attr('title'),
                link: item.attr('href'),
            };
        })
        .get();

    const listall = list.concat(list2)

    const items = await Promise.all(
        listall.map((item) =>
            ctx.cache.tryGet(item.link, async () => {
                const detailResponse = await got({
                    method: 'get',
                    url: item.link,
                });
                const content = cheerio.load(detailResponse.data);
                if (content('meta[name="date"]').attr('content') != undefined){
                    item.description = content('.schema_foto').html() + content('.captionv2').html() + '<!--fenjiexian-->' + content('.NormalTextoNoticia').html();
              
                    item.pubDate = parseDate(content('meta[name="date"]').attr('content').replace(' ', '')); 
                   
                }
                

                return item;
            })
        )
    );

    ctx.state.data = {
        title: $('title').text(),
        link: currentUrl,
        item: items,
    };
};
