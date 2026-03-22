import {
    ProductionCreateRequest,
    ProductionResponse,
    ProductionUpdateRequest,
} from "@/types/api/production.api.types";
import {
    Production,
    ProductionCreateInput,
    ProductionUpdateInput,
} from "@/types/models/production.types";

export const mapProduction = (response: ProductionResponse): Production => {
    return {
        id: response.id,
        sourceId: response.source_id,
        slug: response.slug,
        supertitleNl: response.supertitle_nl,
        supertitleEn: response.supertitle_en,
        titleNl: response.title_nl,
        titleEn: response.title_en,
        artistNl: response.artist_nl,
        artistEn: response.artist_en,
        metaTitleNl: response.meta_title_nl,
        metaTitleEn: response.meta_title_en,
        metaDescriptionNl: response.meta_description_nl,
        metaDescriptionEn: response.meta_description_en,
        taglineNl: response.tagline_nl,
        taglineEn: response.tagline_en,
        teaserNl: response.teaser_nl,
        teaserEn: response.teaser_en,
        descriptionNl: response.description_nl,
        descriptionEn: response.description_en,
        descriptionExtraNl: response.description_extra_nl,
        descriptionExtraEn: response.description_extra_en,
        description2Nl: response.description_2_nl,
        description2En: response.description_2_en,
        video1: response.video_1,
        video2: response.video_2,
        quoteNl: response.quote_nl,
        quoteEn: response.quote_en,
        quoteSourceNl: response.quote_source_nl,
        quoteSourceEn: response.quote_source_en,
        programmeNl: response.programme_nl,
        programmeEn: response.programme_en,
        infoNl: response.info_nl,
        infoEn: response.info_en,
        descriptionShortNl: response.description_short_nl,
        descriptionShortEn: response.description_short_en,
        eticketInfo: response.eticket_info,
        uitdatabankTheme: response.uitdatabank_theme,
        uitdatabankType: response.uitdatabank_type,
    };
};

export const mapProductions = (response: ProductionResponse[]): Production[] =>
    response.map(mapProduction);

export const mapCreateProductionInput = (input: ProductionCreateInput): ProductionCreateRequest => {
    return {
        source_id: input.sourceId,
        slug: input.slug,
        supertitle_nl: input.supertitleNl,
        supertitle_en: input.supertitleEn,
        title_nl: input.titleNl,
        title_en: input.titleEn,
        artist_nl: input.artistNl,
        artist_en: input.artistEn,
        meta_title_nl: input.metaTitleNl,
        meta_title_en: input.metaTitleEn,
        meta_description_nl: input.metaDescriptionNl,
        meta_description_en: input.metaDescriptionEn,
        tagline_nl: input.taglineNl,
        tagline_en: input.taglineEn,
        teaser_nl: input.teaserNl,
        teaser_en: input.teaserEn,
        description_nl: input.descriptionNl,
        description_en: input.descriptionEn,
        description_extra_nl: input.descriptionExtraNl,
        description_extra_en: input.descriptionExtraEn,
        description_2_nl: input.description2Nl,
        description_2_en: input.description2En,
        video_1: input.video1,
        video_2: input.video2,
        quote_nl: input.quoteNl,
        quote_en: input.quoteEn,
        quote_source_nl: input.quoteSourceNl,
        quote_source_en: input.quoteSourceEn,
        programme_nl: input.programmeNl,
        programme_en: input.programmeEn,
        info_nl: input.infoNl,
        info_en: input.infoEn,
        description_short_nl: input.descriptionShortNl,
        description_short_en: input.descriptionShortEn,
        eticket_info: input.eticketInfo,
        uitdatabank_theme: input.uitdatabankTheme,
        uitdatabank_type: input.uitdatabankType,
    };
};

export const mapUpdateProductionInput = (input: ProductionUpdateInput): ProductionUpdateRequest => {
    return {
        ...mapCreateProductionInput(input),
        id: input.id,
    };
};
