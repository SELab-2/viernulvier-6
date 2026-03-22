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

const toNullable = <T>(value: T | null | undefined): T | null => value ?? null;

export const mapProduction = (response: ProductionResponse): Production => {
    return {
        id: response.id,
        sourceId: toNullable(response.source_id),
        slug: response.slug,
        supertitleNl: toNullable(response.supertitle_nl),
        supertitleEn: toNullable(response.supertitle_en),
        titleNl: toNullable(response.title_nl),
        titleEn: toNullable(response.title_en),
        artistNl: toNullable(response.artist_nl),
        artistEn: toNullable(response.artist_en),
        metaTitleNl: toNullable(response.meta_title_nl),
        metaTitleEn: toNullable(response.meta_title_en),
        metaDescriptionNl: toNullable(response.meta_description_nl),
        metaDescriptionEn: toNullable(response.meta_description_en),
        taglineNl: toNullable(response.tagline_nl),
        taglineEn: toNullable(response.tagline_en),
        teaserNl: toNullable(response.teaser_nl),
        teaserEn: toNullable(response.teaser_en),
        descriptionNl: toNullable(response.description_nl),
        descriptionEn: toNullable(response.description_en),
        descriptionExtraNl: toNullable(response.description_extra_nl),
        descriptionExtraEn: toNullable(response.description_extra_en),
        description2Nl: toNullable(response.description_2_nl),
        description2En: toNullable(response.description_2_en),
        video1: toNullable(response.video_1),
        video2: toNullable(response.video_2),
        quoteNl: toNullable(response.quote_nl),
        quoteEn: toNullable(response.quote_en),
        quoteSourceNl: toNullable(response.quote_source_nl),
        quoteSourceEn: toNullable(response.quote_source_en),
        programmeNl: toNullable(response.programme_nl),
        programmeEn: toNullable(response.programme_en),
        infoNl: toNullable(response.info_nl),
        infoEn: toNullable(response.info_en),
        descriptionShortNl: toNullable(response.description_short_nl),
        descriptionShortEn: toNullable(response.description_short_en),
        eticketInfo: toNullable(response.eticket_info),
        uitdatabankTheme: toNullable(response.uitdatabank_theme),
        uitdatabankType: toNullable(response.uitdatabank_type),
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
